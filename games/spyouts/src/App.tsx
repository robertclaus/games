import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import {
  FullGameState,
  PublicGameState,
  Card,
  GameAction,
  CodeCard,
  VaultSlot,
  SpyCharacter,
  SPY_EMOJI,
} from './game/types';
import {
  initGame,
  applyAction,
  getPublicState,
  getPrivateState,
  resolveAction,
  decrementCountdown,
} from './game/gameEngine';
import { Lobby } from './components/Lobby';
import { GameBoard, GameBoardAction } from './components/GameBoard';
import { ScoreScreen } from './components/ScoreScreen';

// ── Types ──────────────────────────────────────────────────────────────────────

type AppView = 'lobby' | 'waiting' | 'game' | 'scores';

interface RoomInfo {
  roomId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  hostPlayerId: string;
  character: SpyCharacter;
}

interface WaitingPlayer {
  playerId: string;
  name: string;
  character: SpyCharacter;
}

interface ScoreData {
  winnerId: string;
  codes: Record<string, CodeCard>;
  vaults: Record<string, VaultSlot[]>;
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);

  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [myCode, setMyCode] = useState<CodeCard>({ digits: [0, 0, 0] });
  const [myVault, setMyVault] = useState<VaultSlot[]>([null, null, null]);
  const [sneakPeakCards, setSneakPeakCards] = useState<Card[] | undefined>(undefined);

  const fullStateRef = useRef<FullGameState | null>(null);
  const playerNamesRef = useRef<Record<string, string>>({});
  const playerCharactersRef = useRef<Record<string, SpyCharacter>>({});

  const [scoreData, setScoreData] = useState<ScoreData | null>(null);

  // Pending action timer
  const pendingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      sendPrivateState(player.playerId, state);
    }
  }

  function sendPrivateState(targetPlayerId: string, state: FullGameState) {
    const priv = getPrivateState(state, targetPlayerId);
    send(targetPlayerId, 'PRIVATE_STATE', priv);
  }

  // ── Pending action timer management ───────────────────────────────────────
  function clearPendingTimer() {
    if (pendingTimerRef.current) {
      clearInterval(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }

  function startPendingActionTimer() {
    clearPendingTimer();
    pendingTimerRef.current = setInterval(() => {
      const state = fullStateRef.current;
      if (!state || !state.pendingAction || state.turnPhase !== 'pendingAction') {
        clearPendingTimer();
        return;
      }

      const decremented = decrementCountdown(state);
      fullStateRef.current = decremented;

      if (decremented.pendingAction!.countdown <= 0) {
        clearPendingTimer();
        // Resolve action
        const resolved = resolveAction(decremented);
        fullStateRef.current = resolved;

        broadcastState(resolved);

        if (resolved.phase === 'ended') {
          handleGameEnd(resolved);
        }
      } else {
        // Broadcast public state with updated countdown
        const pub = getPublicState(decremented);
        send('all', 'PUBLIC_STATE', pub);
        // If SneakPeak sub-phase, also send private state to actor
        if (decremented.pendingAction?.action === 'SneakPeak') {
          sendPrivateState(decremented.pendingAction.playerId, decremented);
        }
      }
    }, 1000);
  }

  function handleGameEnd(state: FullGameState) {
    const codes: Record<string, CodeCard> = {};
    const vaults: Record<string, VaultSlot[]> = {};
    for (const p of state.players) {
      codes[p.playerId] = state.codes[p.playerId];
      vaults[p.playerId] = state.vaults[p.playerId];
    }
    const data: ScoreData = {
      winnerId: state.winnerId!,
      codes,
      vaults,
    };
    send('all', 'SCORE_RESULTS', data);
    setScoreData(data);
    setPublicState(getPublicState(state));
    setView('scores');
  }

  // ── Message handler ────────────────────────────────────────────────────────
  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfo) return;
    const { isHost, playerId } = roomInfo;

    if (msg.type === 'PLAYER_CONNECTED') {
      const payload = msg.payload as { playerId: string; playerName?: string; character?: SpyCharacter };
      const newPid = payload.playerId;
      const existingName = playerNamesRef.current[newPid];
      const newName = payload.playerName ?? existingName ?? newPid;
      const newChar = payload.character ?? playerCharactersRef.current[newPid] ?? 'Denis';

      playerNamesRef.current[newPid] = newName;
      playerCharactersRef.current[newPid] = newChar;

      setWaitingPlayers(prev => {
        const existing = prev.find(p => p.playerId === newPid);
        if (existing) {
          if (existing.name !== newName || existing.character !== newChar) {
            return prev.map(p => p.playerId === newPid ? { ...p, name: newName, character: newChar } : p);
          }
          return prev;
        }
        return [...prev, { playerId: newPid, name: newName, character: newChar }];
      });

      if (isHost) {
        if (fullStateRef.current) {
          sendPrivateState(newPid, fullStateRef.current);
          send('all', 'PUBLIC_STATE', getPublicState(fullStateRef.current));
        } else {
          const roster = Object.entries(playerNamesRef.current).map(([pid, name]) => ({
            playerId: pid,
            name,
            character: playerCharactersRef.current[pid] ?? 'Denis',
          }));
          send('all', 'PLAYER_LIST', { players: roster });
        }
      }
    }

    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) {
        playerNamesRef.current[p.playerId] = p.name;
        playerCharactersRef.current[p.playerId] = p.character;
      }
    }

    if (msg.type === 'PLAYER_DISCONNECTED') {
      const payload = msg.payload as { playerId: string };
      setWaitingPlayers(prev => prev.filter(p => p.playerId !== payload.playerId));
    }

    if (msg.type === 'PUBLIC_STATE') {
      const payload = msg.payload as PublicGameState;
      setPublicState(payload);
      if (payload.phase === 'ended' && !isHost) {
        // Wait for SCORE_RESULTS
      }
    }

    if (msg.type === 'PRIVATE_STATE') {
      const payload = msg.payload as { hand: Card[]; code: CodeCard; vault: VaultSlot[]; sneakPeakCards?: Card[] };
      setMyHand(payload.hand);
      setMyCode(payload.code);
      setMyVault(payload.vault);
      setSneakPeakCards(payload.sneakPeakCards);
      setView('game');
    }

    if (msg.type === 'SCORE_RESULTS') {
      const payload = msg.payload as ScoreData;
      setScoreData(payload);
      setView('scores');
    }

    if (msg.type === 'ACTION' && isHost) {
      const fromPlayerId = msg.from;
      const action = msg.payload as GameAction;
      if (!fullStateRef.current) return;

      if (action.type === 'REQUEST_STATE') {
        sendPrivateState(fromPlayerId, fullStateRef.current);
        send(fromPlayerId, 'PUBLIC_STATE', getPublicState(fullStateRef.current));
        return;
      }

      const prevPhase = fullStateRef.current.turnPhase;
      const newState = applyAction(fullStateRef.current, fromPlayerId, action);
      fullStateRef.current = newState;

      // Handle pending action timer
      if (newState.turnPhase === 'pendingAction' && prevPhase !== 'pendingAction') {
        broadcastState(newState);
        startPendingActionTimer();
      } else if (newState.turnPhase !== 'pendingAction' && prevPhase === 'pendingAction') {
        // Counter was played — cancel timer
        clearPendingTimer();
        broadcastState(newState);
      } else if (newState.turnPhase === 'sneakPeakChoose') {
        // SneakPeak resolved — send private state with peek cards to actor
        clearPendingTimer();
        const pub = getPublicState(newState);
        send('all', 'PUBLIC_STATE', pub);
        for (const p of newState.players) {
          sendPrivateState(p.playerId, newState);
        }
      } else {
        broadcastState(newState);
      }

      if (newState.phase === 'ended') {
        clearPendingTimer();
        handleGameEnd(newState);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo]);

  const handleConnect = useCallback(() => {
    if (!roomInfo) return;
    sendRef.current?.('all', 'PLAYER_CONNECTED', {
      playerId: roomInfo.playerId,
      playerName: roomInfo.playerName,
      character: roomInfo.character,
    });
    setWaitingPlayers(prev => {
      if (prev.some(p => p.playerId === roomInfo.playerId)) return prev;
      return [...prev, { playerId: roomInfo.playerId, name: roomInfo.playerName, character: roomInfo.character }];
    });
    playerNamesRef.current[roomInfo.playerId] = roomInfo.playerName;
    playerCharactersRef.current[roomInfo.playerId] = roomInfo.character;

    if (!roomInfo.isHost) {
      setTimeout(() => {
        sendRef.current?.(roomInfo.hostPlayerId, 'ACTION', { type: 'REQUEST_STATE' });
      }, 500);
    }
  }, [roomInfo]);

  const { send: wsSend } = useWebSocket(wsUrl, handleMessage, handleConnect);

  useEffect(() => {
    sendRef.current = wsSend;
  }, [wsSend]);

  // Cleanup timer on unmount
  useEffect(() => () => clearPendingTimer(), []);

  // ── Lobby → Room ───────────────────────────────────────────────────────────
  const handleJoinRoom = useCallback((
    roomId: string,
    playerId: string,
    playerName: string,
    isHost: boolean,
    hostPlayerId: string,
    character: SpyCharacter
  ) => {
    setRoomInfo({ roomId, playerId, playerName, isHost, hostPlayerId, character });
    playerNamesRef.current[playerId] = playerName;
    playerCharactersRef.current[playerId] = character;
    const url = `ws://${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}`;
    setWsUrl(url);
    setView('waiting');
  }, []);

  // ── Start Game ─────────────────────────────────────────────────────────────
  const handleStartGame = useCallback(() => {
    if (!roomInfo) return;
    if (waitingPlayers.length < 2) return;

    const playerIds = waitingPlayers.map(p => p.playerId);
    const playerNames = { ...playerNamesRef.current };
    const playerCharacters = { ...playerCharactersRef.current };

    const gameState = initGame(playerIds, playerNames, playerCharacters);
    fullStateRef.current = gameState;

    broadcastState(gameState);

    // Update host's local state
    const priv = getPrivateState(gameState, roomInfo.playerId);
    setMyHand(priv.hand);
    setMyCode(priv.code);
    setMyVault(priv.vault);
    setPublicState(getPublicState(gameState));
    setView('game');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo, waitingPlayers]);

  // ── Game action handler ────────────────────────────────────────────────────
  const handleGameAction = useCallback((action: GameBoardAction) => {
    if (!roomInfo) return;
    const { isHost, playerId } = roomInfo;
    const gameAction = action as GameAction;

    if (isHost) {
      if (!fullStateRef.current) return;

      const prevPhase = fullStateRef.current.turnPhase;
      const newState = applyAction(fullStateRef.current, playerId, gameAction);
      fullStateRef.current = newState;

      if (newState.turnPhase === 'pendingAction' && prevPhase !== 'pendingAction') {
        broadcastState(newState);
        startPendingActionTimer();
      } else if (newState.turnPhase !== 'pendingAction' && prevPhase === 'pendingAction') {
        clearPendingTimer();
        broadcastState(newState);
      } else if (newState.turnPhase === 'sneakPeakChoose') {
        clearPendingTimer();
        send('all', 'PUBLIC_STATE', getPublicState(newState));
        for (const p of newState.players) {
          sendPrivateState(p.playerId, newState);
        }
      } else {
        broadcastState(newState);
      }

      // Update host's local private state
      const priv = getPrivateState(newState, playerId);
      setMyHand(priv.hand);
      setMyCode(priv.code);
      setMyVault(priv.vault);
      setSneakPeakCards(priv.sneakPeakCards);
      setPublicState(getPublicState(newState));

      if (newState.phase === 'ended') {
        clearPendingTimer();
        handleGameEnd(newState);
      }
    } else {
      sendRef.current?.(roomInfo.hostPlayerId, 'ACTION', gameAction);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo]);

  // ── Play Again ─────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    clearPendingTimer();
    fullStateRef.current = null;
    setPublicState(null);
    setMyHand([]);
    setMyCode({ digits: [0, 0, 0] });
    setMyVault([null, null, null]);
    setScoreData(null);
    setSneakPeakCards(undefined);
    setView('waiting');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return <Lobby onJoinRoom={handleJoinRoom} />;
  }

  if (view === 'waiting' && roomInfo) {
    return (
      <WaitingRoom
        roomId={roomInfo.roomId}
        playerId={roomInfo.playerId}
        players={waitingPlayers}
        isHost={roomInfo.isHost}
        onStartGame={handleStartGame}
      />
    );
  }

  if (view === 'scores' && scoreData && publicState) {
    return (
      <ScoreScreen
        winnerId={scoreData.winnerId}
        players={publicState.players}
        codes={scoreData.codes}
        vaults={scoreData.vaults}
        onPlayAgain={handlePlayAgain}
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
        myCode={myCode}
        myVault={myVault}
        sneakPeakCards={sneakPeakCards}
        onAction={handleGameAction}
        isMyTurn={isMyTurn}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-text-dim)',
    }}>
      Connecting...
    </div>
  );
}

// ── Waiting Room ───────────────────────────────────────────────────────────────

interface WaitingRoomProps {
  roomId: string;
  playerId: string;
  players: WaitingPlayer[];
  isHost: boolean;
  onStartGame: () => void;
}

function WaitingRoom({ roomId, playerId: _playerId, players, isHost, onStartGame }: WaitingRoomProps) {
  const canStart = players.length >= 2 && players.length <= 4;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{
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
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🕵️</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent)' }}>Briefing Room</h2>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Room Code:</span>
            <span style={{
              fontFamily: 'monospace', fontSize: 22, fontWeight: 800,
              letterSpacing: '4px', color: 'var(--color-accent)',
              background: 'rgba(0,255,136,0.1)', padding: '4px 12px',
              borderRadius: 6, border: '1px solid var(--color-border)',
            }}>
              {roomId}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>
            Share this code with other agents (2–4 players)
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Agents ({players.length}/4)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((p, i) => (
              <div key={p.playerId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'var(--color-surface-raised)',
                borderRadius: 6, border: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: 22 }}>{SPY_EMOJI[p.character] ?? '🕵️'}</span>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.character}</span>
                {i === 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>
                    HOST
                  </span>
                )}
              </div>
            ))}
            {players.length < 2 && (
              <div style={{
                padding: '8px 12px', border: '1px dashed var(--color-border)',
                borderRadius: 6, color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center',
              }}>
                Waiting for more agents...
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
              Begin Mission ({players.length} agent{players.length !== 1 ? 's' : ''})
            </button>
            {!canStart && players.length < 2 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                Need at least 2 agents to start
              </p>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: 14 }}>
            Waiting for mission briefing...
          </div>
        )}
      </div>
    </div>
  );
}
