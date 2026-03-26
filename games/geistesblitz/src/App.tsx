import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import { FullGameState, PublicGameState, GameAction } from './game/types';
import { initGame, applyAction, getPublicState } from './game/engine';
import { Lobby, WaitingRoom } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ScoreScreen } from './components/ScoreScreen';

// ── Types ──────────────────────────────────────────────────────────────────────

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

function getUrlParams(): RoomInfo | null {
  const p = new URLSearchParams(window.location.search);
  const roomId = p.get('roomId');
  const playerId = p.get('playerId');
  const playerName = p.get('playerName');
  const hostPlayerId = p.get('hostPlayerId');
  if (!roomId || !playerId || !playerName || !hostPlayerId) return null;
  return { roomId, playerId, playerName, isHost: playerId === hostPlayerId, hostPlayerId };
}

// ── App ────────────────────────────────────────────────────────────────────────

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
  // When launched from the lobby, fetch expected player count so we can auto-start
  const [expectedPlayerCount, setExpectedPlayerCount] = useState<number | null>(null);
  useEffect(() => {
    if (!initialRoom) return;
    fetch(`/api/rooms/${initialRoom.roomId}`)
      .then(r => r.json())
      .then((data: { playerCount: number }) => setExpectedPlayerCount(data.playerCount))
      .catch(() => setExpectedPlayerCount(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fullStateRef = useRef<FullGameState | null>(null);
  const playerNamesRef = useRef<Record<string, string>>(
    initialRoom ? { [initialRoom.playerId]: initialRoom.playerName } : {}
  );

  // ── Timer refs (host only) ─────────────────────────────────────────────────
  const resultTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);

  function clearTimers() {
    if (resultTimerRef.current !== null) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    if (revealTimerRef.current !== null) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }

  // ── Send ref trick ─────────────────────────────────────────────────────────
  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);
  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  // ── setupTimersForPhase ────────────────────────────────────────────────────
  // Must only be called by host. Uses a ref-captured version of handleHostAction
  // to avoid stale closure issues with roomInfo.
  const roomInfoRef = useRef<RoomInfo | null>(initialRoom);
  useEffect(() => { roomInfoRef.current = roomInfo; }, [roomInfo]);

  function setupTimersForPhase(state: FullGameState) {
    clearTimers();

    if (state.phase === 'result') {
      resultTimerRef.current = window.setTimeout(() => { // 3s to match countdown display
        if (!fullStateRef.current) return;
        const hostId = roomInfoRef.current?.hostPlayerId;
        if (!hostId) return;
        try {
          const nextState = applyAction(fullStateRef.current, hostId, { type: 'ADVANCE' });
          fullStateRef.current = nextState;
          const pub = getPublicState(nextState);
          send('all', 'PUBLIC_STATE', pub);
          setPublicState(pub);
          if (nextState.phase === 'game_over') {
            setView('over');
          } else {
            setupTimersForPhase(nextState);
          }
        } catch (e) {
          console.error('ADVANCE error:', e);
        }
      }, 3000);
    } else if (state.phase === 'revealing') {
      revealTimerRef.current = window.setTimeout(() => {
        if (!fullStateRef.current || fullStateRef.current.phase !== 'revealing') return;
        const hostId = roomInfoRef.current?.hostPlayerId;
        if (!hostId) return;
        try {
          const nextState = applyAction(fullStateRef.current, hostId, { type: 'ADVANCE' });
          fullStateRef.current = nextState;
          const pub = getPublicState(nextState);
          send('all', 'PUBLIC_STATE', pub);
          setPublicState(pub);
          if (nextState.phase === 'game_over') {
            setView('over');
          } else {
            setupTimersForPhase(nextState);
          }
        } catch (e) {
          console.error('ADVANCE (timeout) error:', e);
        }
      }, 10000);
    }
  }

  // ── Host action handler ────────────────────────────────────────────────────
  function handleHostAction(playerId: string, action: GameAction) {
    if (!fullStateRef.current) return;
    clearTimers();
    try {
      const newState = applyAction(fullStateRef.current, playerId, action);
      fullStateRef.current = newState;
      const pub = getPublicState(newState);
      send('all', 'PUBLIC_STATE', pub);
      setPublicState(pub);
      if (newState.phase === 'game_over') {
        setView('over');
      } else {
        setupTimersForPhase(newState);
      }
    } catch (e) {
      console.error('Action error:', e);
      // Re-arm timers — clearTimers() ran above but state didn't change
      if (fullStateRef.current) setupTimersForPhase(fullStateRef.current);
    }
  }

  // ── Message handler ────────────────────────────────────────────────────────
  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfoRef.current) return;
    const { isHost, playerId } = roomInfoRef.current;

    // ── PLAYER_CONNECTED ───────────────────────────────────────────────────
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

      // If a non-host sees the host connect, re-announce so the host catches up
      // (handles the race where non-host connected before the host did)
      if (!isHost && newPid === roomInfoRef.current?.hostPlayerId) {
        const me = roomInfoRef.current;
        sendRef.current?.('all', 'PLAYER_CONNECTED', { playerId: me.playerId, playerName: me.playerName });
      }

      if (isHost) {
        if (fullStateRef.current) {
          // Game already running — send current state to reconnecting player
          send(newPid, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
        } else {
          // Still in lobby — send current player roster
          const roster = Object.entries(playerNamesRef.current).map(([pid, name]) => ({
            playerId: pid,
            name,
          }));
          send('all', 'PLAYER_LIST', { players: roster });
        }
      }
    }

    // ── PLAYER_LIST ────────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) {
        playerNamesRef.current[p.playerId] = p.name;
      }
    }

    // ── PLAYER_DISCONNECTED ────────────────────────────────────────────────
    if (msg.type === 'PLAYER_DISCONNECTED') {
      const payload = msg.payload as { playerId: string };
      setWaitingPlayers(prev => prev.filter(p => p.playerId !== payload.playerId));
    }

    // ── PUBLIC_STATE ───────────────────────────────────────────────────────
    if (msg.type === 'PUBLIC_STATE') {
      const payload = msg.payload as PublicGameState;
      setPublicState(payload);
      if (payload.phase === 'game_over') {
        setView('over');
      } else if (payload.phase !== 'lobby') {
        setView('game');
      }
    }

    // ── GAME_ACTION (host receives from clients) ───────────────────────────
    if (msg.type === 'GAME_ACTION' && isHost) {
      const fromPlayerId = msg.from;
      const action = msg.payload as GameAction;
      if (action.type === 'START_GAME') return;
      handleHostAction(fromPlayerId, action);
    }

    // ── REQUEST_STATE ──────────────────────────────────────────────────────
    if (msg.type === 'REQUEST_STATE' && isHost) {
      const fromPlayerId = msg.from;
      if (fullStateRef.current) {
        send(fromPlayerId, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
      }
    }

    // ── PLAY_AGAIN ─────────────────────────────────────────────────────────
    if (msg.type === 'PLAY_AGAIN' && !isHost) {
      clearTimers();
      fullStateRef.current = null;
      setPublicState(null);
      setView('waiting');
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Clear timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Auto-start when launched from lobby: once all expected players are connected
  useEffect(() => {
    if (!initialRoom?.isHost || expectedPlayerCount === null || fullStateRef.current) return;
    if (waitingPlayers.length < expectedPlayerCount) return;
    if (waitingPlayers.length < 2) return;
    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };
    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;
    const pub = getPublicState(gameState);
    sendRef.current?.('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');
    setupTimersForPhase(gameState);
  }, [waitingPlayers, expectedPlayerCount]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Start Game ─────────────────────────────────────────────────────────────
  const handleStartGame = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    if (waitingPlayers.length < 1) return;

    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };

    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;

    const pub = getPublicState(gameState);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');

    // Start the 10s reveal timer for the first card
    setupTimersForPhase(gameState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers]);

  // ── Game action handler (called from GameBoard) ─────────────────────────────
  const handleGameAction = useCallback((action: GameAction) => {
    if (!roomInfoRef.current) return;
    const { isHost, playerId, hostPlayerId } = roomInfoRef.current;

    if (isHost) {
      handleHostAction(playerId, action);
    } else {
      // Non-host sends GUESS to host via WebSocket
      sendRef.current?.(hostPlayerId, 'GAME_ACTION', action);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Play Again ─────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    clearTimers();
    fullStateRef.current = null;
    setPublicState(null);
    send('all', 'PLAY_AGAIN', {});
    setView('waiting');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return <Lobby onJoin={handleJoinRoom} />;
  }

  if (view === 'waiting' && roomInfo) {
    // Launched from the top-level lobby — skip manual start, show auto-launch screen
    if (initialRoom) {
      const needed = expectedPlayerCount ?? '?';
      const connected = waitingPlayers.length;
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
          <div style={{ textAlign: 'center', color: '#E2E8F0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>👻 Geistesblitz</div>
            <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: 8 }}>
              Connecting players… {connected}/{needed}
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

    return (
      <WaitingRoom
        roomId={roomInfo.roomId}
        players={waitingPlayers}
        isHost={roomInfo.isHost}
        myPlayerId={roomInfo.playerId}
        onStart={handleStartGame}
      />
    );
  }

  if (view === 'over' && publicState) {
    return (
      <ScoreScreen
        players={publicState.players}
        isHost={roomInfo?.isHost ?? false}
        onPlayAgain={handlePlayAgain}
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
        />
      );
    }

    return (
      <GameBoard
        publicState={publicState}
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
      background: '#1a0a2e',
      color: '#a78bfa',
    }}>
      Connecting...
    </div>
  );
}
