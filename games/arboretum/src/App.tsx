import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import {
  FullGameState,
  PublicGameState,
  Card,
  GameAction,
  PlayerScoreResult,
} from './game/types';
import { initGame, applyAction, getPublicState } from './game/gameEngine';
import { calculateScores } from './game/scoring';
import { Lobby } from './components/Lobby';
import { GameBoard, GameBoardAction } from './components/GameBoard';
import { ScoreScreen } from './components/ScoreScreen';

// ─── App State Types ──────────────────────────────────────────────────────────

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

// ─── App Component ────────────────────────────────────────────────────────────

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

  // Waiting room state
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);

  // Game state (non-host: only public + my hand)
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);

  // Host-only full state
  const fullStateRef = useRef<FullGameState | null>(null);

  // Score results
  const [scoreResults, setScoreResults] = useState<PlayerScoreResult[] | null>(null);

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

  // ── WebSocket message handler ────────────────────────────────────────────────

  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfo) return;
    const { isHost, playerId } = roomInfo;

    // ── Player connected (server → all, or client → all with playerName) ────────
    if (msg.type === 'PLAYER_CONNECTED') {
      const payload = msg.payload as { playerId: string; playerName?: string };
      const newPlayerId = payload.playerId;
      // Only update the name if the message actually carries one; otherwise keep existing
      const existingName = playerNamesRef.current[newPlayerId];
      const newName = payload.playerName ?? existingName ?? newPlayerId;

      playerNamesRef.current[newPlayerId] = newName;

      setWaitingPlayers(prev => {
        const existing = prev.find(p => p.playerId === newPlayerId);
        if (existing) {
          // Update name in case the first message didn't have it
          if (existing.name !== newName) {
            return prev.map(p => p.playerId === newPlayerId ? { ...p, name: newName } : p);
          }
          return prev;
        }
        return [...prev, { playerId: newPlayerId, name: newName }];
      });

      // Re-announce fix: non-host re-announces when it sees the host connect
      if (!isHost && newPlayerId === roomInfoRef.current?.hostPlayerId) {
        const me = roomInfoRef.current;
        sendRef.current?.('all', 'PLAYER_CONNECTED', { playerId: me.playerId, playerName: me.playerName });
      }

      // If host: broadcast the full current player list so late-joiners see everyone
      if (isHost) {
        if (fullStateRef.current) {
          sendStateToPlayer(newPlayerId, fullStateRef.current, send);
        } else {
          // Still in waiting room — send the up-to-date roster to all
          const roster = Object.entries(playerNamesRef.current).map(([pid, name]) => ({ playerId: pid, name }));
          send('all', 'PLAYER_LIST', { players: roster });
        }
      }
    }

    // ── Player list (host → all, sent when someone new joins in waiting room) ───
    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) {
        playerNamesRef.current[p.playerId] = p.name;
      }
    }

    // ── Player disconnected ─────────────────────────────────────────────────────
    if (msg.type === 'PLAYER_DISCONNECTED') {
      const payload = msg.payload as { playerId: string };
      setWaitingPlayers(prev => prev.filter(p => p.playerId !== payload.playerId));
    }

    // ── Public state (host → all) ───────────────────────────────────────────────
    if (msg.type === 'PUBLIC_STATE') {
      const payload = msg.payload as PublicGameState;
      setPublicState(payload);
      if (payload.phase === 'ended') {
        setView('game'); // Will show score overlay in game or switch to scores
      }
    }

    // ── Game state (host → specific player: hand + public) ─────────────────────
    if (msg.type === 'GAME_STATE') {
      const payload = msg.payload as { hand: Card[]; publicState: PublicGameState };
      setMyHand(payload.hand);
      setPublicState(payload.publicState);
      setView('game');
    }

    // ── Score results (host → all) ──────────────────────────────────────────────
    if (msg.type === 'SCORE_RESULTS') {
      const payload = msg.payload as PlayerScoreResult[];
      setScoreResults(payload);
      setView('scores');
    }

    // ── Action (player → host) ──────────────────────────────────────────────────
    if (msg.type === 'ACTION' && isHost) {
      const fromPlayerId = msg.from;
      const action = msg.payload as GameAction;

      if (!fullStateRef.current) return;

      if (action.type === 'REQUEST_STATE') {
        sendStateToPlayer(fromPlayerId, fullStateRef.current, send);
        return;
      }

      const newState = applyAction(fullStateRef.current, fromPlayerId, action);
      fullStateRef.current = newState;

      // Broadcast public state
      const pub = getPublicState(newState);
      send('all', 'PUBLIC_STATE', pub);

      // Send private state to each player
      for (const player of newState.players) {
        sendStateToPlayer(player.playerId, newState, send);
      }

      // Handle game end
      if (newState.phase === 'ended') {
        const results = calculateScores(newState);
        // Attach scores to public state
        const scores: Record<string, number> = {};
        for (const r of results) scores[r.playerId] = r.total;
        newState.scores = scores;
        send('all', 'SCORE_RESULTS', results);
        // If host is also a player, set their scores
        setScoreResults(results);
        setView('scores');
      }
    }

  }, [roomInfo]); // send will be captured by ref via the send callback

  // We need `send` in handleMessage but it's defined after; use a ref trick
  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);
  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  const handleConnect = useCallback(() => {
    if (!roomInfo) return;
    // Announce ourselves
    sendRef.current?.('all', 'PLAYER_CONNECTED', {
      playerId: roomInfo.playerId,
      playerName: roomInfo.playerName,
    });
    // Register ourselves locally
    setWaitingPlayers(prev => {
      if (prev.some(p => p.playerId === roomInfo.playerId)) return prev;
      return [...prev, { playerId: roomInfo.playerId, name: roomInfo.playerName }];
    });
    playerNamesRef.current[roomInfo.playerId] = roomInfo.playerName;

    // If not host, request current state from the host (in case we're reconnecting)
    if (!roomInfo.isHost) {
      setTimeout(() => {
        sendRef.current?.(roomInfo.hostPlayerId, 'ACTION', { type: 'REQUEST_STATE' });
      }, 500);
    }
  }, [roomInfo]);

  const { send: wsSend } = useWebSocket(wsUrl, handleMessage, handleConnect);

  // Wire up sendRef
  useEffect(() => {
    sendRef.current = wsSend;
  }, [wsSend]);

  // ── Lobby → Room ─────────────────────────────────────────────────────────────

  const handleJoinRoom = useCallback((roomId: string, playerId: string, playerName: string, isHost: boolean, hostPlayerId: string) => {
    setRoomInfo({ roomId, playerId, playerName, isHost, hostPlayerId });
    playerNamesRef.current[playerId] = playerName;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}&playerName=${encodeURIComponent(playerName)}`;
    setWsUrl(url);
    setView('waiting');
  }, []);

  // ── Start Game ────────────────────────────────────────────────────────────────

  const handleStartGame = useCallback(() => {
    if (!roomInfo) return;
    const players = waitingPlayers;
    if (players.length < 2) return;

    const playerIds = players.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };

    const gameState = initGame(playerIds, playerNames);
    fullStateRef.current = gameState;

    // Broadcast public state
    const pub = getPublicState(gameState);
    sendRef.current?.('all', 'PUBLIC_STATE', pub);

    // Send private state to each player
    for (const player of gameState.players) {
      sendStateToPlayer(player.playerId, gameState, (to, type, payload) => sendRef.current?.(to, type, payload));
    }

    // Update local state for host
    setMyHand(gameState.hands[roomInfo.playerId] ?? []);
    setPublicState(pub);
    setView('game');
  }, [roomInfo, waitingPlayers]);

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
    sendRef.current?.('all', 'PUBLIC_STATE', pub);
    for (const player of gameState.players) {
      sendStateToPlayer(player.playerId, gameState, (to, type, payload) => sendRef.current?.(to, type, payload));
    }
    setMyHand(gameState.hands[initialRoom.playerId] ?? []);
    setPublicState(pub);
    setView('game');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayers, expectedPlayerCount]);

  // ── Game action handler ───────────────────────────────────────────────────────

  const handleGameAction = useCallback((action: GameBoardAction) => {
    if (!roomInfo) return;
    const { isHost, playerId } = roomInfo;

    const gameAction = action as GameAction;

    if (isHost) {
      // Process locally
      if (!fullStateRef.current) return;
      const newState = applyAction(fullStateRef.current, playerId, gameAction);
      fullStateRef.current = newState;

      // Broadcast public state
      const pub = getPublicState(newState);
      sendRef.current?.('all', 'PUBLIC_STATE', pub);

      // Send private state to each player
      for (const player of newState.players) {
        sendStateToPlayer(player.playerId, newState, (to, type, payload) => sendRef.current?.(to, type, payload));
      }

      // Update own hand
      setMyHand(newState.hands[playerId] ?? []);
      setPublicState(pub);

      if (newState.phase === 'ended') {
        const results = calculateScores(newState);
        const scores: Record<string, number> = {};
        for (const r of results) scores[r.playerId] = r.total;
        newState.scores = scores;
        sendRef.current?.('all', 'SCORE_RESULTS', results);
        setScoreResults(results);
        setView('scores');
      }
    } else {
      // Send to host
      sendRef.current?.(roomInfo.hostPlayerId, 'ACTION', gameAction);
    }
  }, [roomInfo]);

  // ── Play Again ────────────────────────────────────────────────────────────────

  const handlePlayAgain = useCallback(() => {
    fullStateRef.current = null;
    setPublicState(null);
    setMyHand([]);
    setScoreResults(null);
    setView('waiting');
  }, []);

  const handleGoHome = useCallback(() => {
    const info = roomInfoRef.current;
    if (!info) { window.location.href = '/lobby/'; return; }
    const params = new URLSearchParams({ roomId: info.roomId, playerId: info.playerId, playerName: info.playerName, hostPlayerId: info.hostPlayerId });
    window.location.href = `/lobby/?${params.toString()}`;
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return <Lobby onJoinRoom={handleJoinRoom} />;
  }

  if (view === 'waiting' && initialRoom) {
    const needed = expectedPlayerCount ?? '?';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🌳 Arboretum</div>
          <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Connecting players… {waitingPlayers.length}/{needed}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {waitingPlayers.map(p => (
              <div key={p.playerId} style={{ padding: '4px 12px', background: 'var(--color-surface)', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
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
        playerId={roomInfo.playerId}
        players={waitingPlayers}
        isHost={roomInfo.isHost}
        onStartGame={handleStartGame}
        onGoHome={handleGoHome}
      />
    );
  }

  if (view === 'scores' && scoreResults && publicState) {
    return (
      <ScoreScreen
        results={scoreResults}
        players={publicState.players}
        onPlayAgain={handlePlayAgain}
        onGoHome={handleGoHome}
      />
    );
  }

  if (view === 'game' && publicState && roomInfo) {
    const isMyTurn =
      publicState.players[publicState.currentPlayerIndex]?.playerId === roomInfo.playerId;

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

  // Fallback / loading
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-dim)',
      }}
    >
      Connecting...
    </div>
  );
}

// ─── Waiting Room ─────────────────────────────────────────────────────────────

interface WaitingRoomProps {
  roomId: string;
  playerId: string;
  players: WaitingPlayer[];
  isHost: boolean;
  onStartGame: () => void;
  onGoHome?: () => void;
}

function WaitingRoom({ roomId, playerId: _playerId, players, isHost, onStartGame, onGoHome }: WaitingRoomProps) {
  const canStart = players.length >= 2 && players.length <= 4;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          padding: '40px 48px',
          minWidth: 360,
          maxWidth: 480,
          width: '100%',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌳</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#8fce8f' }}>Waiting Room</h2>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Room Code:</span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '4px',
                color: 'var(--color-accent)',
                background: 'rgba(92,184,92,0.1)',
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
              }}
            >
              {roomId}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>
            Share this code with other players to join (2–4 players)
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Players ({players.length}/4)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((p, i) => (
              <div
                key={p.playerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--color-surface-raised)',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: ['#4A90D9', '#E74C3C', '#27AE60', '#F5C842'][i % 4],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                {i === 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>
                    HOST
                  </span>
                )}
              </div>
            ))}
            {players.length < 2 && (
              <div
                style={{
                  padding: '8px 12px',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 6,
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Waiting for more players...
              </div>
            )}
          </div>
        </div>

        {isHost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="primary"
              onClick={onStartGame}
              disabled={!canStart}
              style={{ padding: '12px', fontSize: 15 }}
            >
              Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
            </button>
            {!canStart && players.length < 2 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                Need at least 2 players to start
              </p>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: 14 }}>
            Waiting for host to start the game...
          </div>
        )}
        {onGoHome && (
          <button onClick={onGoHome} style={{ padding: '10px', fontSize: '0.9rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', borderRadius: 6, cursor: 'pointer', marginTop: -8 }}>
            Back to Lobby
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Helper: send state to a specific player ──────────────────────────────────

function sendStateToPlayer(
  targetPlayerId: string,
  state: FullGameState,
  sendFn: (to: string, type: string, payload: unknown) => void
) {
  const hand = state.hands[targetPlayerId] ?? [];
  const pub = getPublicState(state);
  sendFn(targetPlayerId, 'GAME_STATE', { hand, publicState: pub });
}
