import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import {
  FullGameState,
  PublicGameState,
  TummyCard,
  GameAction,
} from './game/types';
import { initGame, applyAction, getPublicState, getPrivateState } from './game/engine';
import { Lobby, WaitingRoom } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ScoreScreen } from './components/ScoreScreen';

// ── Types ──────────────────────────────────────────────────────────────────────

type AppView = 'lobby' | 'waiting' | 'game' | 'scores';

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

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);

  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [myHand, setMyHand] = useState<TummyCard[]>([]);

  const fullStateRef = useRef<FullGameState | null>(null);
  const playerNamesRef = useRef<Record<string, string>>({});

  // ── Send ref trick ─────────────────────────────────────────────────────────
  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);
  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  // ── Broadcast state helpers ────────────────────────────────────────────────
  function broadcastState(state: FullGameState) {
    const pub = getPublicState(state);
    send('all', 'PUBLIC_STATE', pub);
    for (const player of state.players) {
      const priv = getPrivateState(state, player.playerId);
      send(player.playerId, 'PRIVATE_STATE', priv);
    }
  }

  // ── Message handler ────────────────────────────────────────────────────────
  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfo) return;
    const { isHost, playerId } = roomInfo;

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

      if (isHost) {
        if (fullStateRef.current) {
          // Game already running — send current state to reconnecting player
          const priv = getPrivateState(fullStateRef.current, newPid);
          send(newPid, 'PRIVATE_STATE', priv);
          send('all', 'PUBLIC_STATE', getPublicState(fullStateRef.current));
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
    }

    // ── PRIVATE_STATE ──────────────────────────────────────────────────────
    if (msg.type === 'PRIVATE_STATE') {
      const payload = msg.payload as { hand: TummyCard[] };
      setMyHand(payload.hand);
      setView('game');
    }

    // ── GAME_ACTION (host receives from clients) ───────────────────────────
    if (msg.type === 'GAME_ACTION' && isHost) {
      const fromPlayerId = msg.from;
      const action = msg.payload as GameAction;
      if (!fullStateRef.current) return;

      if (action.type === 'START_GAME') return; // handled separately

      try {
        const newState = applyAction(fullStateRef.current, fromPlayerId, action);
        fullStateRef.current = newState;
        broadcastState(newState);

        if (newState.phase === 'over') {
          send('all', 'GAME_OVER', { winnerId: newState.winnerId });
        }
      } catch (err) {
        console.error('Error applying action from', fromPlayerId, err);
      }
    }

    // ── REQUEST_STATE ──────────────────────────────────────────────────────
    if (msg.type === 'REQUEST_STATE' && isHost) {
      const fromPlayerId = msg.from;
      if (fullStateRef.current) {
        const priv = getPrivateState(fullStateRef.current, fromPlayerId);
        send(fromPlayerId, 'PRIVATE_STATE', priv);
        send(fromPlayerId, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
      }
    }

    // ── PLAY_AGAIN ─────────────────────────────────────────────────────────
    if (msg.type === 'PLAY_AGAIN') {
      fullStateRef.current = null;
      setPublicState(null);
      setMyHand([]);
      setView('waiting');
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo]);

  const handleConnect = useCallback(() => {
    if (!roomInfo) return;
    sendRef.current?.('all', 'PLAYER_CONNECTED', {
      playerId: roomInfo.playerId,
      playerName: roomInfo.playerName,
    });
    setWaitingPlayers(prev => {
      if (prev.some(p => p.playerId === roomInfo.playerId)) return prev;
      return [...prev, { playerId: roomInfo.playerId, name: roomInfo.playerName }];
    });
    playerNamesRef.current[roomInfo.playerId] = roomInfo.playerName;

    if (!roomInfo.isHost) {
      setTimeout(() => {
        sendRef.current?.(roomInfo.hostPlayerId, 'REQUEST_STATE', {});
      }, 500);
    }
  }, [roomInfo]);

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
    setRoomInfo({ roomId, playerId, playerName, isHost, hostPlayerId });
    playerNamesRef.current[playerId] = playerName;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}`;
    setWsUrl(url);
    setView('waiting');
  }, []);

  // ── Start Game ─────────────────────────────────────────────────────────────
  const handleStartGame = useCallback(() => {
    if (!roomInfo || !roomInfo.isHost) return;
    if (waitingPlayers.length < 2) return;

    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };

    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;

    broadcastState(gameState);

    // Update host's local state directly
    const priv = getPrivateState(gameState, roomInfo.playerId);
    setMyHand(priv.hand);
    setPublicState(getPublicState(gameState));
    setView('game');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo, waitingPlayers]);

  // ── Game action handler ─────────────────────────────────────────────────────
  const handleGameAction = useCallback((action: GameAction) => {
    if (!roomInfo) return;
    const { isHost, playerId } = roomInfo;

    if (isHost) {
      if (!fullStateRef.current) return;
      try {
        const newState = applyAction(fullStateRef.current, playerId, action);
        fullStateRef.current = newState;
        broadcastState(newState);

        // Update host's local private state
        const priv = getPrivateState(newState, playerId);
        setMyHand(priv.hand);
        setPublicState(getPublicState(newState));

        if (newState.phase === 'over') {
          send('all', 'GAME_OVER', { winnerId: newState.winnerId });
        }
      } catch (err) {
        console.error('Error applying action', err);
      }
    } else {
      // Non-host sends action to host
      sendRef.current?.(roomInfo.hostPlayerId, 'GAME_ACTION', action);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo]);

  // ── Play Again ─────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    if (!roomInfo?.isHost) return;
    fullStateRef.current = null;
    setPublicState(null);
    setMyHand([]);
    send('all', 'PLAY_AGAIN', {});
    setView('waiting');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return <Lobby onJoin={handleJoinRoom} />;
  }

  if (view === 'waiting' && roomInfo) {
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

  if (view === 'scores' && publicState) {
    return (
      <ScoreScreen
        winnerId={publicState.winnerId ?? ''}
        players={publicState.players}
        isHost={roomInfo?.isHost ?? false}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (view === 'game' && publicState && roomInfo) {
    const isMyTurn =
      publicState.players[publicState.currentPlayerIndex]?.playerId === roomInfo.playerId;

    // If game is over, switch to scores
    if (publicState.phase === 'over' && view === 'game') {
      // Will render game board briefly, then scores on next pass
      // Better to check here:
      return (
        <ScoreScreen
          winnerId={publicState.winnerId ?? ''}
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
        myHand={myHand}
        onAction={handleGameAction}
        isMyTurn={isMyTurn}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a1628',
      color: '#78909c',
    }}>
      Connecting...
    </div>
  );
}
