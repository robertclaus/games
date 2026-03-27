import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import {
  FullGameState,
  PublicGameState,
  CardInstance,
  GameAction,
} from './game/types';
import {
  initGame,
  applyAction,
  getPublicState,
  getPlayerHand,
  canSpellWord,
  setValidating,
  acceptWord,
  rejectWord,
} from './game/engine';
import { isValidWord } from './game/words';
import { Lobby, WaitingRoom } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ScoreScreen } from './components/ScoreScreen';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppView = 'lobby' | 'waiting' | 'game' | 'over';

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

type SubmitWordAction = Extract<GameAction, { type: 'SUBMIT_WORD' }>;

// ── App ───────────────────────────────────────────────────────────────────────

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
  const [myHand, setMyHand] = useState<CardInstance[]>([]);

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

  // ── Send ref trick ──────────────────────────────────────────────────────────
  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);

  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  function broadcastPublic(state: FullGameState) {
    const pub = getPublicState(state);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
  }

  // ── Async SUBMIT_WORD handler (host only) ───────────────────────────────────

  async function handleSubmitWordAsync(fromPlayerId: string, action: SubmitWordAction) {
    if (!fullStateRef.current) return;

    // 1. Set validating phase
    let state = setValidating(fullStateRef.current, action.word);
    fullStateRef.current = state;
    broadcastPublic(state);

    // 2. Check card coverage
    const player = state.players.find(p => p.playerId === fromPlayerId);
    if (!player) return;

    const coverage = canSpellWord(
      player.hand,
      action.word,
      action.cardIds,
      action.useCommonCard,
      action.commonCardLetter
    );

    if (!coverage.ok) {
      state = rejectWord(fullStateRef.current, coverage.message);
      fullStateRef.current = state;
      broadcastPublic(state);
      // Restore hand (nothing was moved yet)
      const handMsg = getPlayerHand(state, fromPlayerId);
      send(fromPlayerId, 'PRIVATE_HAND', handMsg);
      if (fromPlayerId === roomInfoRef.current?.playerId) {
        setMyHand(handMsg.hand);
      }
      return;
    }

    // 3. Dictionary validation
    const valid = await isValidWord(action.word);
    if (!valid) {
      state = rejectWord(fullStateRef.current, `"${action.word.toUpperCase()}" is not a valid word`);
      fullStateRef.current = state;
      broadcastPublic(state);
      const handMsg = getPlayerHand(state, fromPlayerId);
      send(fromPlayerId, 'PRIVATE_HAND', handMsg);
      if (fromPlayerId === roomInfoRef.current?.playerId) {
        setMyHand(handMsg.hand);
      }
      return;
    }

    // 4. Accept the word
    state = acceptWord(
      fullStateRef.current,
      fromPlayerId,
      action.word,
      action.cardIds,
      action.useCommonCard,
      action.commonCardLetter
    );
    fullStateRef.current = state;
    broadcastPublic(state);

    // 5. Send updated private hand (played cards removed)
    const updatedHandMsg = getPlayerHand(state, fromPlayerId);
    send(fromPlayerId, 'PRIVATE_HAND', updatedHandMsg);
    if (fromPlayerId === roomInfoRef.current?.playerId) {
      setMyHand(updatedHandMsg.hand);
    }

    if (state.phase === 'game_over') {
      setView('over');
    }
  }

  // ── Sync action handler (host only) ────────────────────────────────────────

  function handleSyncAction(fromPlayerId: string, action: GameAction) {
    if (!fullStateRef.current) return;
    try {
      const newState = applyAction(fullStateRef.current, fromPlayerId, action);
      fullStateRef.current = newState;
      broadcastPublic(newState);

      // Send updated private hand after certain actions
      if (action.type === 'TRASH_CARD' || action.type === 'END_TURN') {
        const handMsg = getPlayerHand(newState, fromPlayerId);
        send(fromPlayerId, 'PRIVATE_HAND', handMsg);
        if (fromPlayerId === roomInfoRef.current?.playerId) {
          setMyHand(handMsg.hand);
        }

        // On END_TURN: the new active player also needs their hand sent
        if (action.type === 'END_TURN' && newState.turnState) {
          const nextPlayerId = newState.turnState.currentPlayerId;
          if (nextPlayerId !== fromPlayerId) {
            const nextHandMsg = getPlayerHand(newState, nextPlayerId);
            send(nextPlayerId, 'PRIVATE_HAND', nextHandMsg);
            if (nextPlayerId === roomInfoRef.current?.playerId) {
              setMyHand(nextHandMsg.hand);
            }
          }
        }
      }

      if (newState.phase === 'game_over') {
        setView('over');
      }
    } catch (e) {
      console.error('Action error:', e);
    }
  }

  // ── Message handler ─────────────────────────────────────────────────────────

  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfoRef.current) return;
    const { isHost, playerId } = roomInfoRef.current;

    // ── PLAYER_CONNECTED ──────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_CONNECTED') {
      const payload = msg.payload as { playerId: string; playerName?: string };
      const newPid = payload.playerId;
      const newName = payload.playerName ?? playerNamesRef.current[newPid] ?? newPid;
      playerNamesRef.current[newPid] = newName;

      setWaitingPlayers(prev => {
        const existing = prev.find(p => p.playerId === newPid);
        if (existing) {
          if (existing.name !== newName) {
            return prev.map(p => p.playerId === newPid ? { ...p, name: newName } : p);
          }
          return prev;
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
          // Game running — send current state to reconnecting player
          send(newPid, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
          const handMsg = getPlayerHand(fullStateRef.current, newPid);
          send(newPid, 'PRIVATE_HAND', handMsg);
        } else {
          // Still in lobby — send roster
          const roster = Object.entries(playerNamesRef.current).map(([pid, name]) => ({
            playerId: pid,
            name,
          }));
          send('all', 'PLAYER_LIST', { players: roster });
        }
      }
    }

    // ── PLAYER_LIST ───────────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) {
        playerNamesRef.current[p.playerId] = p.name;
      }
    }

    // ── PLAYER_DISCONNECTED ───────────────────────────────────────────────────
    if (msg.type === 'PLAYER_DISCONNECTED') {
      const payload = msg.payload as { playerId: string };
      setWaitingPlayers(prev => prev.filter(p => p.playerId !== payload.playerId));
    }

    // ── PUBLIC_STATE ──────────────────────────────────────────────────────────
    if (msg.type === 'PUBLIC_STATE') {
      const payload = msg.payload as PublicGameState;
      setPublicState(payload);
      if (payload.phase === 'game_over') {
        setView('over');
      } else if (payload.phase === 'playing') {
        setView('game');
      }
    }

    // ── PRIVATE_HAND ──────────────────────────────────────────────────────────
    if (msg.type === 'PRIVATE_HAND') {
      const payload = msg.payload as { hand: CardInstance[]; pendingExtraDraws: number };
      setMyHand(payload.hand);
      setView('game');
    }

    // ── GAME_ACTION (host receives from clients) ──────────────────────────────
    if (msg.type === 'GAME_ACTION' && isHost) {
      const fromPlayerId = msg.from;
      const action = msg.payload as GameAction;
      if (action.type === 'SUBMIT_WORD') {
        void handleSubmitWordAsync(fromPlayerId, action);
      } else {
        handleSyncAction(fromPlayerId, action);
      }
    }

    // ── REQUEST_STATE ─────────────────────────────────────────────────────────
    if (msg.type === 'REQUEST_STATE' && isHost) {
      const fromPlayerId = msg.from;
      if (fullStateRef.current) {
        send(fromPlayerId, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
        const handMsg = getPlayerHand(fullStateRef.current, fromPlayerId);
        send(fromPlayerId, 'PRIVATE_HAND', handMsg);
      }
    }

    // ── PLAY_AGAIN ────────────────────────────────────────────────────────────
    if (msg.type === 'PLAY_AGAIN' && !isHost) {
      fullStateRef.current = null;
      setPublicState(null);
      setMyHand([]);
      setView('waiting');
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── handleConnect ───────────────────────────────────────────────────────────

  const handleConnect = useCallback(() => {
    if (!roomInfoRef.current) return;
    const info = roomInfoRef.current;
    sendRef.current?.('all', 'PLAYER_CONNECTED', {
      playerId: info.playerId,
      playerName: info.playerName,
    });
    setWaitingPlayers(prev => {
      if (prev.some(p => p.playerId === info.playerId)) return prev;
      return [...prev, { playerId: info.playerId, name: info.playerName }];
    });
    playerNamesRef.current[info.playerId] = info.playerName;

    if (!info.isHost) {
      setTimeout(() => {
        sendRef.current?.(info.hostPlayerId, 'REQUEST_STATE', {});
      }, 500);
    }
  }, []);

  const { send: wsSend } = useWebSocket(wsUrl, handleMessage, handleConnect);

  useEffect(() => {
    sendRef.current = wsSend;
  }, [wsSend]);

  // ── Join Room ───────────────────────────────────────────────────────────────

  const handleJoinRoom = useCallback((
    roomId: string,
    playerName: string,
    isHost: boolean,
    playerId: string,
    hostPlayerId: string,
  ) => {
    const info: RoomInfo = { roomId, playerId, playerName, isHost, hostPlayerId };
    setRoomInfo(info);
    roomInfoRef.current = info;
    playerNamesRef.current[playerId] = playerName;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}&playerName=${encodeURIComponent(playerName)}`;
    setWsUrl(url);
    setView('waiting');
  }, []);

  // Auto-start when launched from lobby
  useEffect(() => {
    if (!initialRoom?.isHost || expectedPlayerCount === null || fullStateRef.current) return;
    if (waitingPlayers.length < expectedPlayerCount) return;
    if (waitingPlayers.length < 2) return;
    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };
    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;
    const pub = getPublicState(gameState);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');
    for (const player of gameState.players) {
      const handMsg = getPlayerHand(gameState, player.playerId);
      send(player.playerId, 'PRIVATE_HAND', handMsg);
      if (player.playerId === initialRoom.playerId) setMyHand(handMsg.hand);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers, expectedPlayerCount]);

  // ── Start Game ──────────────────────────────────────────────────────────────

  const handleStartGame = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    if (waitingPlayers.length < 2) return;

    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };

    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;

    const pub = getPublicState(gameState);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');

    // Send each player their private hand
    for (const player of gameState.players) {
      const handMsg = getPlayerHand(gameState, player.playerId);
      send(player.playerId, 'PRIVATE_HAND', handMsg);
      if (player.playerId === roomInfoRef.current?.playerId) {
        setMyHand(handMsg.hand);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers]);

  // ── Game Action handler ─────────────────────────────────────────────────────

  const handleGameAction = useCallback((action: GameAction) => {
    if (!roomInfoRef.current) return;
    const { isHost, playerId, hostPlayerId } = roomInfoRef.current;

    if (isHost) {
      if (action.type === 'SUBMIT_WORD') {
        void handleSubmitWordAsync(playerId, action);
      } else {
        handleSyncAction(playerId, action);
      }
    } else {
      sendRef.current?.(hostPlayerId, 'GAME_ACTION', action);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Play Again ──────────────────────────────────────────────────────────────

  const handlePlayAgain = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    fullStateRef.current = null;
    setPublicState(null);
    setMyHand([]);
    send('all', 'PLAY_AGAIN', {});
    setView('waiting');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoHome = useCallback(() => {
    const info = roomInfoRef.current;
    if (!info) { window.location.href = '/lobby/'; return; }
    const params = new URLSearchParams({ roomId: info.roomId, playerId: info.playerId, playerName: info.playerName, hostPlayerId: info.hostPlayerId });
    window.location.href = `/lobby/?${params.toString()}`;
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return <Lobby onJoin={handleJoinRoom} />;
  }

  if (view === 'waiting' && initialRoom) {
    const needed = expectedPlayerCount ?? '?';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2C1A0E' }}>
        <div style={{ textAlign: 'center', color: '#F5E6C8' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>📖 Paperback</div>
          <div style={{ fontSize: '1rem', color: '#C4A882', marginBottom: 8 }}>
            Connecting players… {waitingPlayers.length}/{needed}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {waitingPlayers.map(p => (
              <div key={p.playerId} style={{ padding: '4px 12px', background: '#3D2A1A', borderRadius: 6, border: '1px solid #6B4C2A', fontSize: '0.9rem' }}>
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

  if (view === 'over' && publicState) {
    return (
      <ScoreScreen
        players={publicState.players}
        isHost={roomInfo?.isHost ?? false}
        onPlayAgain={handlePlayAgain}
        onGoHome={handleGoHome}
      />
    );
  }

  if (view === 'game' && publicState && roomInfo) {
    if (publicState.phase === 'game_over') {
      return (
        <ScoreScreen
          players={publicState.players}
          isHost={roomInfo.isHost}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
        />
      );
    }

    return (
      <GameBoard
        publicState={publicState}
        myHand={myHand}
        myPlayerId={roomInfo.playerId}
        isHost={roomInfo.isHost}
        onAction={handleGameAction}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#2C1A0E',
      color: '#F5E6C8',
    }}>
      Connecting...
    </div>
  );
}
