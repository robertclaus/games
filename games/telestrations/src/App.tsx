import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import { FullGameState, PublicGameState, GameAction, BookletPrompt } from './game/types';
import {
  initGame, applyAction, getPublicState, getAllPrompts, getPromptForPlayer,
} from './game/engine';
import { Lobby, WaitingRoom } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ResultsViewer } from './components/ResultsViewer';

type AppView = 'lobby' | 'waiting' | 'game';

interface RoomInfo {
  roomId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  hostPlayerId: string;
}

interface WaitingPlayer {
  playerId: string;
  name: string;
}

function getUrlParams(): RoomInfo | null {
  const p = new URLSearchParams(window.location.search);
  const roomId = p.get('roomId');
  const playerId = p.get('playerId');
  const playerName = p.get('playerName');
  const hostPlayerId = p.get('hostPlayerId');
  if (!roomId || !playerId || !playerName || !hostPlayerId) return null;
  return { roomId, playerId, playerName, isHost: playerId === hostPlayerId, hostPlayerId };
}

export default function App() {
  const initialRoom = useMemo(getUrlParams, []);

  const [view, setView] = useState<AppView>(initialRoom ? 'waiting' : 'lobby');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(initialRoom);
  const [wsUrl, setWsUrl] = useState<string | null>(() => {
    if (!initialRoom) return null;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws?roomId=${initialRoom.roomId}&playerId=${initialRoom.playerId}&playerName=${encodeURIComponent(initialRoom.playerName)}`;
  });
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [myPrompt, setMyPrompt] = useState<BookletPrompt | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fullStateRef = useRef<FullGameState | null>(null);
  const playerNamesRef = useRef<Record<string, string>>(
    initialRoom ? { [initialRoom.playerId]: initialRoom.playerName } : {}
  );
  const roomInfoRef = useRef<RoomInfo | null>(initialRoom);
  useEffect(() => { roomInfoRef.current = roomInfo; }, [roomInfo]);

  const [expectedPlayerCount, setExpectedPlayerCount] = useState<number | null>(null);
  useEffect(() => {
    if (!initialRoom) return;
    fetch(`/api/rooms/${initialRoom.roomId}`)
      .then(r => r.json())
      .then((data: { playerCount: number }) => setExpectedPlayerCount(data.playerCount))
      .catch(() => setExpectedPlayerCount(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);
  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  // Reset submitted + prompt when round changes
  useEffect(() => {
    setSubmitted(false);
    // Don't reset myPrompt here — keep showing it until the new one arrives
  }, [publicState?.round, publicState?.phase]);

  // ── Send prompts to all players (host only) ─────────────────────────────────

  function sendAllPrompts(state: FullGameState) {
    if (!roomInfoRef.current?.isHost) return;
    if (state.phase === 'results') return; // no prompts needed in results

    const myPlayerId = roomInfoRef.current.playerId;
    const prompts = getAllPrompts(state);

    for (const [playerId, prompt] of prompts) {
      if (playerId === myPlayerId) {
        setMyPrompt(prompt); // host sets own prompt directly
      } else {
        send(playerId, 'BOOKLET_PROMPT', prompt);
      }
    }
  }

  // ── Host action handler ─────────────────────────────────────────────────────

  function handleHostAction(playerId: string, action: GameAction) {
    if (!fullStateRef.current) return;
    const prevRound = fullStateRef.current.round;
    const prevPhase = fullStateRef.current.phase;

    try {
      const newState = applyAction(fullStateRef.current, playerId, action);
      fullStateRef.current = newState;
      const pub = getPublicState(newState);
      send('all', 'PUBLIC_STATE', pub);
      setPublicState(pub);

      // If round advanced or phase changed, dispatch new prompts
      if (newState.round !== prevRound || newState.phase !== prevPhase) {
        sendAllPrompts(newState);
      }
    } catch (e) {
      console.error('Action error:', e);
    }
  }

  // ── Message handler ─────────────────────────────────────────────────────────

  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfoRef.current) return;
    const { isHost, playerId } = roomInfoRef.current;

    if (msg.type === 'PLAYER_CONNECTED') {
      const payload = msg.payload as { playerId: string; playerName?: string };
      const newPid = payload.playerId;
      const newName = payload.playerName ?? playerNamesRef.current[newPid] ?? newPid;
      playerNamesRef.current[newPid] = newName;

      setWaitingPlayers(prev => {
        const existing = prev.find(p => p.playerId === newPid);
        if (existing) {
          return existing.name !== newName
            ? prev.map(p => p.playerId === newPid ? { ...p, name: newName } : p)
            : prev;
        }
        return [...prev, { playerId: newPid, name: newName }];
      });

      // Re-announce fix: non-host re-announces when it sees the host connect
      if (!isHost && newPid === roomInfoRef.current?.hostPlayerId) {
        const me = roomInfoRef.current;
        sendRef.current?.('all', 'PLAYER_CONNECTED', { playerId: me.playerId, playerName: me.playerName });
      }

      if (isHost) {
        if (fullStateRef.current) {
          send(newPid, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
          // Also resend prompt if game is in an active (non-results) round
          if (fullStateRef.current.phase !== 'results') {
            const pIdx = fullStateRef.current.players.findIndex(p => p.playerId === newPid);
            if (pIdx !== -1) {
              const prompt = getPromptForPlayer(fullStateRef.current, pIdx);
              send(newPid, 'BOOKLET_PROMPT', prompt);
            }
          }
        } else {
          const roster = Object.entries(playerNamesRef.current).map(([pid, name]) => ({ playerId: pid, name }));
          send('all', 'PLAYER_LIST', { players: roster });
        }
      }
    }

    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) playerNamesRef.current[p.playerId] = p.name;
    }

    if (msg.type === 'PLAYER_DISCONNECTED') {
      const payload = msg.payload as { playerId: string };
      setWaitingPlayers(prev => prev.filter(p => p.playerId !== payload.playerId));
    }

    if (msg.type === 'PUBLIC_STATE') {
      const payload = msg.payload as PublicGameState;
      setPublicState(payload);
      setView('game');
    }

    if (msg.type === 'BOOKLET_PROMPT') {
      setMyPrompt(msg.payload as BookletPrompt);
    }

    if (msg.type === 'GAME_ACTION' && isHost) {
      handleHostAction(msg.from, msg.payload as GameAction);
    }

    if (msg.type === 'REQUEST_STATE' && isHost) {
      if (fullStateRef.current) {
        send(msg.from, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
        if (fullStateRef.current.phase !== 'results') {
          const pIdx = fullStateRef.current.players.findIndex(p => p.playerId === msg.from);
          if (pIdx !== -1) {
            send(msg.from, 'BOOKLET_PROMPT', getPromptForPlayer(fullStateRef.current, pIdx));
          }
        }
      }
    }

    if (msg.type === 'PLAY_AGAIN' && !isHost) {
      fullStateRef.current = null;
      setPublicState(null);
      setMyPrompt(null);
      setSubmitted(false);
      setView('waiting');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback(() => {
    if (!roomInfoRef.current) return;
    const info = roomInfoRef.current;
    sendRef.current?.('all', 'PLAYER_CONNECTED', { playerId: info.playerId, playerName: info.playerName });
    setWaitingPlayers(prev => {
      if (prev.some(p => p.playerId === info.playerId)) return prev;
      return [...prev, { playerId: info.playerId, name: info.playerName }];
    });
    playerNamesRef.current[info.playerId] = info.playerName;
    if (!info.isHost) {
      setTimeout(() => sendRef.current?.(info.hostPlayerId, 'REQUEST_STATE', {}), 500);
    }
  }, []);

  const { send: wsSend } = useWebSocket(wsUrl, handleMessage, handleConnect);
  useEffect(() => { sendRef.current = wsSend; }, [wsSend]);

  // ── Join / Start ────────────────────────────────────────────────────────────

  const handleJoinRoom = useCallback((
    roomId: string, playerName: string, isHost: boolean, playerId: string, hostPlayerId: string,
  ) => {
    const info: RoomInfo = { roomId, playerId, playerName, isHost, hostPlayerId };
    setRoomInfo(info);
    roomInfoRef.current = info;
    playerNamesRef.current[playerId] = playerName;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    setWsUrl(`${proto}//${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}&playerName=${encodeURIComponent(playerName)}`);
    setView('waiting');
  }, []);

  // Auto-start when launched from lobby (telestrations requires 4–8 players)
  useEffect(() => {
    if (!initialRoom?.isHost || expectedPlayerCount === null || fullStateRef.current) return;
    if (waitingPlayers.length < expectedPlayerCount) return;
    if (waitingPlayers.length < 4 || waitingPlayers.length > 8) return;
    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };
    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;
    const pub = getPublicState(gameState);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');
    sendAllPrompts(gameState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers, expectedPlayerCount]);

  const handleStartGame = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    const n = waitingPlayers.length;
    if (n < 4 || n > 8) return;

    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };
    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;

    const pub = getPublicState(gameState);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');

    // Round 0 = writing, prompt has no previous entry — still send so each player
    // gets their bookletOwnerName (which is themselves in round 0)
    sendAllPrompts(gameState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers]);

  // ── Game action ─────────────────────────────────────────────────────────────

  const handleGameAction = useCallback((action: GameAction) => {
    if (!roomInfoRef.current) return;
    const { isHost, playerId, hostPlayerId } = roomInfoRef.current;
    setSubmitted(true);
    if (isHost) {
      handleHostAction(playerId, action);
    } else {
      sendRef.current?.(hostPlayerId, 'GAME_ACTION', action);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Play again ──────────────────────────────────────────────────────────────

  const handlePlayAgain = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    fullStateRef.current = null;
    setPublicState(null);
    setMyPrompt(null);
    setSubmitted(false);
    send('all', 'PLAY_AGAIN', {});
    setView('waiting');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoHome = useCallback(() => {
    const info = roomInfoRef.current;
    if (!info) { window.location.href = '/lobby/'; return; }
    const params = new URLSearchParams({ roomId: info.roomId, playerId: info.playerId, playerName: info.playerName, hostPlayerId: info.hostPlayerId });
    window.location.href = `/lobby/?${params.toString()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === 'lobby') return <Lobby onJoin={handleJoinRoom} />;

  if (view === 'waiting' && initialRoom) {
    const needed = expectedPlayerCount ?? '?';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
        <div style={{ textAlign: 'center', color: '#E2E8F0' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>✏️ Telestrations</div>
          <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: 8 }}>
            Connecting players… {waitingPlayers.length}/{needed}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {waitingPlayers.map(p => (
              <div key={p.playerId} style={{ padding: '4px 12px', background: '#1E293B', borderRadius: 6, border: '1px solid #334155', fontSize: '0.9rem' }}>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'waiting' && roomInfo) {
    return (
      <WaitingRoom
        roomId={roomInfo.roomId}
        players={waitingPlayers}
        isHost={roomInfo.isHost}
        myPlayerId={roomInfo.playerId}
        onStart={handleStartGame}
        onGoHome={handleGoHome}
      />
    );
  }

  if (view === 'game' && publicState && roomInfo) {
    if (publicState.phase === 'results') {
      return (
        <ResultsViewer
          booklets={publicState.booklets ?? []}
          players={publicState.players}
          isHost={roomInfo.isHost}
          myPlayerId={roomInfo.playerId}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
        />
      );
    }

    return (
      <GameBoard
        publicState={publicState}
        myPlayerId={roomInfo.playerId}
        isHost={roomInfo.isHost}
        myPrompt={myPrompt}
        submitted={submitted}
        onAction={handleGameAction}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#94A3B8' }}>
      Connecting…
    </div>
  );
}
