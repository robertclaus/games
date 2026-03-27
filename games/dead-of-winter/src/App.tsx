import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import {
  FullGameState,
  PublicGameState,
  PrivatePlayerState,
  GameAction,
} from './game/types';
import { initGame, applyAction, getPublicState, getPrivateState } from './game/engine';
import { Lobby, WaitingRoom } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ScoreScreen } from './components/ScoreScreen';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helper: send state to a player ─────────────────────────────────────────

function sendStateToPlayer(
  targetId: string,
  fullState: FullGameState,
  send: (to: string, type: string, payload: unknown) => void,
) {
  send(targetId, 'PUBLIC_STATE', getPublicState(fullState));
  send(targetId, 'PRIVATE_STATE', getPrivateState(fullState, targetId));
}

function broadcastState(
  fullState: FullGameState,
  send: (to: string, type: string, payload: unknown) => void,
) {
  send('all', 'PUBLIC_STATE', getPublicState(fullState));
  for (const p of fullState.players) {
    send(p.playerId, 'PRIVATE_STATE', getPrivateState(fullState, p.playerId));
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

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

  // Waiting room
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);

  // Game state for non-host
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null);

  // Host-only full state
  const fullStateRef = useRef<FullGameState | null>(null);

  // Player names map (host uses this for initGame)
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

  // ── WebSocket message handler ───────────────────────────────────────────────

  const handleMessage = useCallback((msg: WsMessage) => {
    const ri = roomInfoRef.current;
    if (!ri) return;
    const { isHost, playerId } = ri;

    // ── Player connected ──────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_CONNECTED') {
      const payload = msg.payload as { playerId: string; playerName?: string };
      const newPid = payload.playerId;
      const existingName = playerNamesRef.current[newPid];
      const newName = payload.playerName ?? existingName ?? newPid;
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
        send('all', 'PLAYER_CONNECTED', { playerId: me.playerId, playerName: me.playerName });
      }

      if (isHost) {
        if (fullStateRef.current) {
          sendStateToPlayer(newPid, fullStateRef.current, send);
        } else {
          const roster = Object.entries(playerNamesRef.current)
            .map(([pid, name]) => ({ playerId: pid, name }));
          send('all', 'PLAYER_LIST', { players: roster });
        }
      }
    }

    // ── Player list ───────────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) {
        playerNamesRef.current[p.playerId] = p.name;
      }
    }

    // ── Start game (host → all) ───────────────────────────────────────────────
    if (msg.type === 'START_GAME') {
      setView('game');
    }

    // ── Public state ──────────────────────────────────────────────────────────
    if (msg.type === 'PUBLIC_STATE') {
      const ps = msg.payload as PublicGameState;
      setPublicState(ps);
      if (ps.phase === 'game_over') {
        setView('over');
      }
    }

    // ── Private state ─────────────────────────────────────────────────────────
    if (msg.type === 'PRIVATE_STATE') {
      setPrivateState(msg.payload as PrivatePlayerState);
    }

    // ── Request state (non-host asks host to resend) ──────────────────────────
    if (msg.type === 'REQUEST_STATE' && isHost && fullStateRef.current) {
      sendStateToPlayer(msg.from, fullStateRef.current, send);
    }

    // ── Game action (forwarded by server from non-host to host) ───────────────
    if (msg.type === 'GAME_ACTION' && isHost && fullStateRef.current) {
      const action = msg.payload as GameAction;
      try {
        const nextState = applyAction(fullStateRef.current, msg.from, action);
        fullStateRef.current = nextState;
        broadcastState(nextState, send);
        if (nextState.phase === 'game_over') {
          setView('over');
          // Also update our own public/private state
          setPublicState(getPublicState(nextState));
          setPrivateState(getPrivateState(nextState, playerId));
        }
      } catch (err) {
        console.error('Action failed:', err);
      }
    }

    // ── Play again ────────────────────────────────────────────────────────────
    if (msg.type === 'PLAY_AGAIN') {
      setView('waiting');
      setPublicState(null);
      setPrivateState(null);
      fullStateRef.current = null;
      const roster = Object.entries(playerNamesRef.current)
        .map(([pid, name]) => ({ playerId: pid, name }));
      setWaitingPlayers(roster);
    }
  }, []);

  const { send } = useWebSocket(wsUrl, handleMessage, () => {
    // On connect: announce ourselves
    if (roomInfoRef.current) {
      const { playerId, playerName } = roomInfoRef.current;
      send('all', 'PLAYER_CONNECTED', { playerId, playerName });
    }
  });

  // ── Join / Create room ──────────────────────────────────────────────────────

  function handleJoin(
    roomId: string,
    playerName: string,
    isHost: boolean,
    pid: string,
    hostPlayerId: string,
  ) {
    const ri: RoomInfo = { roomId, playerId: pid, playerName, isHost, hostPlayerId };
    setRoomInfo(ri);
    roomInfoRef.current = ri;
    playerNamesRef.current[pid] = playerName;
    setWaitingPlayers([{ playerId: pid, name: playerName }]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    setWsUrl(`${protocol}//${host}/ws?roomId=${roomId}&playerId=${pid}&playerName=${encodeURIComponent(playerName)}`);
    setView('waiting');
  }

  // ── Start game (host only) ──────────────────────────────────────────────────

  function handleStart() {
    if (!roomInfo?.isHost) return;
    const playerIds = waitingPlayers.map(p => p.playerId);
    const names: Record<string, string> = {};
    for (const p of waitingPlayers) names[p.playerId] = p.name;

    const state = initGame(playerIds, names);
    fullStateRef.current = state;

    // Notify all to enter game
    send('all', 'START_GAME', {});
    setView('game');

    // Send initial state
    broadcastState(state, send);
    setPublicState(getPublicState(state));
    setPrivateState(getPrivateState(state, roomInfo.playerId));
  }

  // ── Send action ─────────────────────────────────────────────────────────────

  function handleAction(action: object) {
    if (!roomInfo) return;
    const { isHost, playerId, hostPlayerId } = roomInfo;

    if (isHost && fullStateRef.current) {
      // Host applies directly
      try {
        const nextState = applyAction(fullStateRef.current, playerId, action as GameAction);
        fullStateRef.current = nextState;
        broadcastState(nextState, send);
        setPublicState(getPublicState(nextState));
        setPrivateState(getPrivateState(nextState, playerId));
        if (nextState.phase === 'game_over') setView('over');
      } catch (err) {
        console.error('Action failed:', err);
      }
    } else {
      // Non-host sends to host
      send(hostPlayerId, 'GAME_ACTION', action);
    }
  }

  // ── Request state on reconnect ──────────────────────────────────────────────

  function requestState() {
    if (roomInfo && !roomInfo.isHost) {
      send(roomInfo.hostPlayerId, 'REQUEST_STATE', {});
    }
  }

  // ── Play again ──────────────────────────────────────────────────────────────

  function handleGoHome() {
    const info = roomInfoRef.current;
    if (!info) { window.location.href = '/lobby/'; return; }
    const params = new URLSearchParams({ roomId: info.roomId, playerId: info.playerId, playerName: info.playerName, hostPlayerId: info.hostPlayerId });
    window.location.href = `/lobby/?${params.toString()}`;
  }

  function handlePlayAgain() {
    if (!roomInfo?.isHost) return;
    send('all', 'PLAY_AGAIN', {});
    setView('waiting');
    setPublicState(null);
    setPrivateState(null);
    fullStateRef.current = null;
    const roster = Object.entries(playerNamesRef.current)
      .map(([pid, name]) => ({ playerId: pid, name }));
    setWaitingPlayers(roster);
  }

  // Auto-start when launched from lobby
  useEffect(() => {
    if (!initialRoom?.isHost || expectedPlayerCount === null || fullStateRef.current) return;
    if (waitingPlayers.length < expectedPlayerCount) return;
    if (waitingPlayers.length < 2) return;
    const playerIds = waitingPlayers.map(p => p.playerId);
    const names: Record<string, string> = {};
    for (const p of waitingPlayers) names[p.playerId] = p.name;
    const state = initGame(playerIds, names);
    fullStateRef.current = state;
    send('all', 'START_GAME', {});
    broadcastState(state, send);
    setPublicState(getPublicState(state));
    setPrivateState(getPrivateState(state, initialRoom.playerId));
    setView('game');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers, expectedPlayerCount]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return <Lobby onJoin={handleJoin} />;
  }

  if (view === 'waiting' && initialRoom) {
    const needed = expectedPlayerCount ?? '?';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
        <div style={{ textAlign: 'center', color: '#E2E8F0' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>☠️ Dead of Winter</div>
          <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: 8 }}>
            Connecting players… {waitingPlayers.length}/{needed}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {waitingPlayers.map(p => (
              <div key={p.playerId} style={{ padding: '4px 12px', background: '#2d2d44', borderRadius: 6, border: '1px solid #444', fontSize: '0.9rem' }}>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'waiting') {
    return (
      <WaitingRoom
        roomId={roomInfo?.roomId ?? ''}
        players={waitingPlayers}
        isHost={roomInfo?.isHost ?? false}
        myPlayerId={roomInfo?.playerId ?? ''}
        onStart={handleStart}
        onGoHome={handleGoHome}
      />
    );
  }

  if (view === 'game' && publicState) {
    return (
      <GameBoard
        publicState={publicState}
        privateState={privateState}
        myPlayerId={roomInfo?.playerId ?? ''}
        isHost={roomInfo?.isHost ?? false}
        hostPlayerId={roomInfo?.hostPlayerId ?? ''}
        onAction={handleAction}
      />
    );
  }

  if (view === 'over' && publicState) {
    return (
      <ScoreScreen
        publicState={publicState}
        privateState={privateState}
        myPlayerId={roomInfo?.playerId ?? ''}
        isHost={roomInfo?.isHost ?? false}
        onPlayAgain={handlePlayAgain}
        onGoHome={handleGoHome}
      />
    );
  }

  // Loading / connecting
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#888',
    }}>
      Connecting...
      {!roomInfo?.isHost && (
        <button
          style={{ marginLeft: 16, padding: '8px 16px', cursor: 'pointer' }}
          onClick={requestState}
        >
          Refresh
        </button>
      )}
    </div>
  );
}
