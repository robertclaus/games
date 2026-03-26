import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import { FullGameState, PublicGameState, GameAction } from './game/types';
import {
  initGame,
  applyAction,
  applyTimeout,
  applyAdvance,
  getPublicState,
  getStorytellerId,
  ROUND_DURATION_MS,
} from './game/engine';
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

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);

  // myAnswer: only non-null when the local player is the current storyteller
  const [myAnswer, setMyAnswer] = useState<string | null>(null);

  const fullStateRef = useRef<FullGameState | null>(null);
  const playerNamesRef = useRef<Record<string, string>>({});
  const roomInfoRef = useRef<RoomInfo | null>(null);
  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);

  // Host-only timers
  const roundTimerRef  = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);

  const RESULT_DISPLAY_MS = 4_000;

  useEffect(() => { roomInfoRef.current = roomInfo; }, [roomInfo]);

  // ── Send helpers ────────────────────────────────────────────────────────────

  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  function broadcastPublic(state: FullGameState) {
    const pub = getPublicState(state);
    send('all', 'PUBLIC_STATE', pub);
    setPublicState(pub);
  }

  // ── Timer management (host only) ────────────────────────────────────────────

  function clearRoundTimer() {
    if (roundTimerRef.current !== null) {
      clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }
  }

  function clearResultTimer() {
    if (resultTimerRef.current !== null) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }

  function clearAllTimers() {
    clearRoundTimer();
    clearResultTimer();
  }

  function beginResultTimer() {
    clearResultTimer();
    resultTimerRef.current = window.setTimeout(() => {
      if (!fullStateRef.current || fullStateRef.current.phase !== 'round_result') return;
      const nextState = applyAdvance(fullStateRef.current);
      fullStateRef.current = nextState;
      broadcastPublic(nextState);

      if (nextState.phase === 'game_over') {
        setView('over');
      } else {
        sendRoundAnswers(nextState);
        startRoundTimer();
      }
    }, RESULT_DISPLAY_MS);
  }

  function startRoundTimer() {
    clearRoundTimer();
    roundTimerRef.current = window.setTimeout(() => {
      if (!fullStateRef.current || fullStateRef.current.phase !== 'round_active') return;
      const timedOut = applyTimeout(fullStateRef.current);
      fullStateRef.current = timedOut;
      broadcastPublic(timedOut);
      beginResultTimer();
    }, ROUND_DURATION_MS);
  }

  // ── Private answer delivery ─────────────────────────────────────────────────

  function sendRoundAnswers(state: FullGameState) {
    const answer = state.currentAnswer;
    const round  = state.round;
    const payload = { answer, round };

    const redId  = getStorytellerId(state, 'red');
    const blueId = getStorytellerId(state, 'blue');

    send(redId,  'ROUND_ANSWER', payload);
    if (blueId !== redId) {
      send(blueId, 'ROUND_ANSWER', payload);
    }

    // Direct update if host is a storyteller (avoid WebSocket round-trip latency)
    const myId = roomInfoRef.current?.playerId;
    if (myId === redId || myId === blueId) {
      setMyAnswer(answer);
    }
  }

  // ── Host action handler ─────────────────────────────────────────────────────

  function handleHostAction(fromPlayerId: string, action: GameAction) {
    if (!fullStateRef.current) return;
    try {
      const prevPhase = fullStateRef.current.phase;
      const newState  = applyAction(fullStateRef.current, fromPlayerId, action);
      fullStateRef.current = newState;
      broadcastPublic(newState);

      // Correct guess triggered round end
      if (newState.phase === 'round_result' && prevPhase === 'round_active') {
        clearRoundTimer();
        beginResultTimer();
      }
    } catch (e) {
      console.error('Action error:', e);
    }
  }

  // ── Message handler ─────────────────────────────────────────────────────────

  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfoRef.current) return;
    const { isHost } = roomInfoRef.current;

    // ── PLAYER_CONNECTED ────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_CONNECTED') {
      const payload = msg.payload as { playerId: string; playerName?: string };
      const newPid  = payload.playerId;
      const newName = payload.playerName ?? playerNamesRef.current[newPid] ?? newPid;
      playerNamesRef.current[newPid] = newName;

      setWaitingPlayers(prev => {
        const existing = prev.find(p => p.playerId === newPid);
        if (existing) {
          if (existing.name !== newName)
            return prev.map(p => p.playerId === newPid ? { ...p, name: newName } : p);
          return prev;
        }
        return [...prev, { playerId: newPid, name: newName }];
      });

      if (isHost) {
        if (fullStateRef.current) {
          // Game running — send current public state to reconnecting player
          send(newPid, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
          // Re-send answer if they are the active storyteller
          if (fullStateRef.current.phase === 'round_active') {
            const s = fullStateRef.current;
            if (newPid === getStorytellerId(s, 'red') || newPid === getStorytellerId(s, 'blue')) {
              send(newPid, 'ROUND_ANSWER', { answer: s.currentAnswer, round: s.round });
            }
          }
        } else {
          // Still in lobby — broadcast roster
          const roster = Object.entries(playerNamesRef.current).map(([pid, name]) => ({ playerId: pid, name }));
          send('all', 'PLAYER_LIST', { players: roster });
        }
      }
    }

    // ── PLAYER_LIST ─────────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) playerNamesRef.current[p.playerId] = p.name;
    }

    // ── PLAYER_DISCONNECTED ─────────────────────────────────────────────────
    if (msg.type === 'PLAYER_DISCONNECTED') {
      const payload = msg.payload as { playerId: string };
      setWaitingPlayers(prev => prev.filter(p => p.playerId !== payload.playerId));
    }

    // ── PUBLIC_STATE ────────────────────────────────────────────────────────
    if (msg.type === 'PUBLIC_STATE') {
      const payload = msg.payload as PublicGameState;
      setPublicState(payload);
      if (payload.phase === 'game_over') {
        setView('over');
      } else {
        setView('game');
      }
    }

    // ── ROUND_ANSWER (storytellers only) ────────────────────────────────────
    if (msg.type === 'ROUND_ANSWER') {
      const payload = msg.payload as { answer: string; round: number };
      setMyAnswer(payload.answer);
    }

    // ── GAME_ACTION (host receives from clients) ─────────────────────────────
    if (msg.type === 'GAME_ACTION' && isHost) {
      handleHostAction(msg.from, msg.payload as GameAction);
    }

    // ── REQUEST_STATE ───────────────────────────────────────────────────────
    if (msg.type === 'REQUEST_STATE' && isHost) {
      if (!fullStateRef.current) return;
      const s = fullStateRef.current;
      send(msg.from, 'PUBLIC_STATE', getPublicState(s));
      if (s.phase === 'round_active') {
        if (msg.from === getStorytellerId(s, 'red') || msg.from === getStorytellerId(s, 'blue')) {
          send(msg.from, 'ROUND_ANSWER', { answer: s.currentAnswer, round: s.round });
        }
      }
    }

    // ── PLAY_AGAIN ──────────────────────────────────────────────────────────
    if (msg.type === 'PLAY_AGAIN' && !isHost) {
      clearAllTimers();
      fullStateRef.current = null;
      setMyAnswer(null);
      setPublicState(null);
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

  useEffect(() => { sendRef.current = wsSend; }, [wsSend]);

  useEffect(() => {
    return () => clearAllTimers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const url = `${proto}//${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}`;
    setWsUrl(url);
    setView('waiting');
  }, []);

  // ── Start Game ──────────────────────────────────────────────────────────────

  const handleStartGame = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    if (waitingPlayers.length < 4) return;

    const playerIds   = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };

    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;
    broadcastPublic(gameState);
    setView('game');

    sendRoundAnswers(gameState);
    startRoundTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers]);

  // ── Game Action ─────────────────────────────────────────────────────────────

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

  // ── Play Again ──────────────────────────────────────────────────────────────

  const handlePlayAgain = useCallback(() => {
    if (!roomInfoRef.current?.isHost) return;
    clearAllTimers();
    fullStateRef.current = null;
    setMyAnswer(null);
    setPublicState(null);
    send('all', 'PLAY_AGAIN', {});
    setView('waiting');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

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

  if ((view === 'over' || (view === 'game' && publicState?.phase === 'game_over')) && publicState) {
    return (
      <ScoreScreen
        publicState={publicState}
        isHost={roomInfo?.isHost ?? false}
        myPlayerId={roomInfo?.playerId ?? ''}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (view === 'game' && publicState && roomInfo) {
    return (
      <GameBoard
        publicState={publicState}
        myPlayerId={roomInfo.playerId}
        myAnswer={myAnswer}
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
      background: '#0F172A',
      color: '#64748B',
      fontSize: 16,
    }}>
      Connecting…
    </div>
  );
}
