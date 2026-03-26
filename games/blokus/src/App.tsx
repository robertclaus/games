import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import { FullGameState, PublicGameState, GameAction } from './game/types';
import { initGame, applyAction, getPublicState } from './game/engine';
import { Lobby, WaitingRoom } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ScoreScreen } from './components/ScoreScreen';

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
  const roomInfoRef = useRef<RoomInfo | null>(initialRoom);
  useEffect(() => { roomInfoRef.current = roomInfo; }, [roomInfo]);

  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);
  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  function handleHostAction(playerId: string, action: GameAction) {
    if (!fullStateRef.current) return;
    try {
      const newState = applyAction(fullStateRef.current, playerId, action);
      fullStateRef.current = newState;
      const pub = getPublicState(newState);
      send('all', 'PUBLIC_STATE', pub);
      setPublicState(pub);
      if (newState.phase === 'game_over') setView('over');
    } catch (e) {
      console.error('Action error:', e);
    }
  }

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

      if (isHost) {
        if (fullStateRef.current) {
          send(newPid, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
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
      if (payload.phase === 'game_over') setView('over');
      else setView('game');
    }

    if (msg.type === 'GAME_ACTION' && isHost) {
      handleHostAction(msg.from, msg.payload as GameAction);
    }

    if (msg.type === 'REQUEST_STATE' && isHost) {
      if (fullStateRef.current) send(msg.from, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
    }

    if (msg.type === 'PLAY_AGAIN' && !isHost) {
      fullStateRef.current = null;
      setPublicState(null);
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

  // Auto-start when launched from lobby: once all expected players are connected
  useEffect(() => {
    if (!initialRoom?.isHost || expectedPlayerCount === null || fullStateRef.current) return;
    if (waitingPlayers.length < expectedPlayerCount) return;
    if (waitingPlayers.length < 2 || waitingPlayers.length > 4) return;
    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };
    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;
    const pub = getPublicState(gameState);
    sendRef.current?.('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');
  }, [waitingPlayers, expectedPlayerCount]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleStartGame = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    if (waitingPlayers.length < 2 || waitingPlayers.length > 4) return;

    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };
    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;

    const pub = getPublicState(gameState);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
    setView('game');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers]);

  const handleGameAction = useCallback((action: GameAction) => {
    if (!roomInfoRef.current) return;
    const { isHost, playerId, hostPlayerId } = roomInfoRef.current;
    if (isHost) {
      handleHostAction(playerId, action);
    } else {
      sendRef.current?.(hostPlayerId, 'GAME_ACTION', action);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    fullStateRef.current = null;
    setPublicState(null);
    send('all', 'PLAY_AGAIN', {});
    setView('waiting');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view === 'lobby') return <Lobby onJoin={handleJoinRoom} />;

  if (view === 'waiting' && roomInfo) {
    // Launched from the top-level lobby — skip manual start, show auto-launch screen
    if (initialRoom) {
      const needed = expectedPlayerCount ?? '?';
      const connected = waitingPlayers.length;
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
          <div style={{ textAlign: 'center', color: '#E2E8F0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>🟦 Blokus</div>
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

  if ((view === 'over' || (view === 'game' && publicState?.phase === 'game_over')) && publicState) {
    return (
      <ScoreScreen
        players={publicState.players}
        isHost={roomInfo?.isHost ?? false}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (view === 'game' && publicState && roomInfo) {
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#94A3B8' }}>
      Connecting…
    </div>
  );
}
