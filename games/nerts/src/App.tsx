import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';
import {
  Card,
  Suit,
  Foundations,
  PlayerPrivateState,
  SharedGameState,
  PlayerDeal,
  PlayerRoundInfo,
  BACK_COLORS,
} from './game/types';
import { dealPlayer } from './game/deck';
import { canPlayOnWorkPile, canPlayToFoundation } from './game/validation';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';

// Selection type (also used in GameBoard)
type Selection =
  | { source: 'nerts' }
  | { source: 'waste' }
  | { source: 'workPile'; pileIndex: number; cardIndex: number }
  | null;

type AppView = 'lobby' | 'waiting' | 'playing' | 'roundEnd' | 'gameOver';

interface WaitingPlayer {
  playerId: string;
  name: string;
}

interface HostFullState {
  foundations: Foundations;
  roundScores: Record<string, number>;
  cumulativeScores: Record<string, number>;
  nertsCounts: Record<string, number>;
  waitingForFinalCounts: boolean;
  finalCountsReceived: Record<string, number>;
  roundEndTimer: ReturnType<typeof setTimeout> | null;
  nertsCallerId: string | null;
}

function buildEmptyFoundations(): Foundations {
  return [];
}

function buildPrivateState(deal: PlayerDeal): PlayerPrivateState {
  return {
    nertsPile: deal.nertsPile,
    workPiles: [
      [deal.workPiles[0]],
      [deal.workPiles[1]],
      [deal.workPiles[2]],
      [deal.workPiles[3]],
    ],
    hand: deal.hand,
    waste: [],
  };
}

export default function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [roomId, setRoomId] = useState('');
  const [myPlayerId, setMyPlayerId] = useState('');
  const [myName, setMyName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [hostPlayerId, setHostPlayerId] = useState('');

  // Waiting room
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);

  // Game state
  const [myState, setMyState] = useState<PlayerPrivateState | null>(null);
  const [myRoundScore, setMyRoundScore] = useState(0);
  const [pendingFoundationCards, setPendingFoundationCards] = useState<Set<string>>(new Set());
  const [sharedState, setSharedState] = useState<SharedGameState>({
    phase: 'lobby',
    foundations: buildEmptyFoundations(),
    players: [],
    cumulativeScores: {},
    roundNumber: 0,
    nertsCallerId: null,
    targetScore: 100,
  });
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameWinnerId, setGameWinnerId] = useState<string | null>(null);

  // Player names map
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  // Host-only full state
  const hostStateRef = useRef<HostFullState | null>(null);

  // Cumulative scores for host (persisted across rounds)
  const cumulativeScoresRef = useRef<Record<string, number>>({});

  // WS URL
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  // Flash message helper
  function showFlash(msg: string) {
    setFlashMessage(msg);
    setTimeout(() => setFlashMessage(null), 1500);
  }

  // --- WebSocket message handler ---
  const handleMessage = useCallback((msg: WsMessage) => {
    const { type, payload, from } = msg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any;

    switch (type) {
      case 'PLAYER_CONNECTED': {
        // Server notifies us when any player connects; if we're host, update
        // the waiting room and re-broadcast the full player list.
        const { playerId: newPid, playerName: newName } = p as { playerId: string; playerName?: string };
        if (isHost) {
          setWaitingPlayers(prev => {
            const name = newName ?? newPid;
            if (prev.some(pl => pl.playerId === newPid)) return prev;
            const updated = [...prev, { playerId: newPid, name }];
            // Broadcast updated list to all (including the new joiner)
            setTimeout(() => {
              send('all', 'PLAYER_LIST', updated);
            }, 0);
            return updated;
          });
          setPlayerNames(prev => ({ ...prev, [newPid]: newName ?? newPid }));
        }
        break;
      }

      case 'PLAYER_DISCONNECTED': {
        const { playerId: gone } = p as { playerId: string };
        setWaitingPlayers(prev => prev.filter(pl => pl.playerId !== gone));
        break;
      }

      case 'PLAYER_LIST': {
        const list = p as WaitingPlayer[];
        setWaitingPlayers(list);
        // Update player names
        setPlayerNames(prev => {
          const next = { ...prev };
          list.forEach((pl: WaitingPlayer) => { next[pl.playerId] = pl.name; });
          return next;
        });
        break;
      }

      case 'DEAL': {
        const deal = p as PlayerDeal;
        const state = buildPrivateState(deal);
        setMyState(state);
        setMyRoundScore(0);
        setPendingFoundationCards(new Set());
        break;
      }

      case 'ROUND_START': {
        const { players } = p as { players: PlayerRoundInfo[] };
        setSharedState(prev => ({
          ...prev,
          phase: 'playing',
          foundations: buildEmptyFoundations(),
          players,
          nertsCallerId: null,
          roundNumber: prev.roundNumber + 1,
        }));
        // Update player names from players list
        setPlayerNames(prev => {
          const next = { ...prev };
          players.forEach((pl: PlayerRoundInfo) => { next[pl.playerId] = pl.name; });
          return next;
        });
        setView('playing');
        setGameOver(false);
        setGameWinnerId(null);
        break;
      }

      case 'FOUNDATION_UPDATE': {
        const { foundations, roundScores } = p as {
          foundations: Foundations;
          roundScores: Record<string, number>;
        };

        // Find cards confirmed for me
        const myConfirmedCards: string[] = [];
        foundations.forEach(pile => {
          pile.forEach((card: Card) => {
            if (card.ownerId === myPlayerId) {
              myConfirmedCards.push(card.id);
            }
          });
        });

        setPendingFoundationCards(prev => {
          const next = new Set(prev);
          myConfirmedCards.forEach(id => next.delete(id));
          return next;
        });

        // Remove confirmed cards from my local state
        setMyState(prev => {
          if (!prev) return prev;
          // Remove any confirmed pending cards from waste, work piles, nerts pile
          const confirmedSet = new Set(myConfirmedCards);

          // We only need to remove cards that are currently pending (in flight)
          // Those cards are in waste top or work pile top
          let newWaste = prev.waste;
          if (prev.waste.length > 0 && confirmedSet.has(prev.waste[prev.waste.length - 1].id)) {
            newWaste = prev.waste.slice(0, -1);
          }

          const newWorkPiles = prev.workPiles.map(pile => {
            if (pile.length > 0 && confirmedSet.has(pile[pile.length - 1].id)) {
              return pile.slice(0, -1);
            }
            return pile;
          });

          let newNerts = prev.nertsPile;
          if (prev.nertsPile.length > 0 && confirmedSet.has(prev.nertsPile[prev.nertsPile.length - 1].id)) {
            newNerts = prev.nertsPile.slice(0, -1);
          }

          return { ...prev, waste: newWaste, workPiles: newWorkPiles, nertsPile: newNerts };
        });

        setMyRoundScore(roundScores[myPlayerId] ?? 0);

        setSharedState(prev => ({
          ...prev,
          foundations,
          players: prev.players.map(pl => ({
            ...pl,
            foundationScore: roundScores[pl.playerId] ?? pl.foundationScore,
          })),
        }));
        break;
      }

      case 'FOUNDATION_REJECTED': {
        const { cardId } = p as { cardId: string };
        setPendingFoundationCards(prev => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        showFlash('Too slow!');
        break;
      }

      case 'NERTS_PILE_COUNT': {
        const { count, playerId } = p as { count: number; playerId: string };
        setSharedState(prev => ({
          ...prev,
          players: prev.players.map(pl =>
            pl.playerId === playerId ? { ...pl, nertsPileCount: count } : pl
          ),
        }));
        break;
      }

      case 'NERTS': {
        const { winnerId } = p as { winnerId: string };
        setSharedState(prev => ({ ...prev, phase: 'roundEnd', nertsCallerId: winnerId }));
        // Send our final nerts count to host
        setMyState(prev => {
          if (!prev) return prev;
          sendToHost('FINAL_NERTS_COUNT', { count: prev.nertsPile.length, playerId: myPlayerId });
          return prev;
        });
        break;
      }

      case 'ROUND_RESULTS': {
        const { roundScores, penalties, cumulativeScores } = p as {
          roundScores: Record<string, number>;
          penalties: Record<string, number>;
          cumulativeScores: Record<string, number>;
        };
        setSharedState(prev => ({
          ...prev,
          phase: 'roundEnd',
          cumulativeScores,
          players: prev.players.map(pl => ({
            ...pl,
            foundationScore: roundScores[pl.playerId] ?? pl.foundationScore,
            nertsPileCount: penalties[pl.playerId] ?? pl.nertsPileCount,
          })),
        }));
        setView('roundEnd');
        break;
      }

      case 'GAME_OVER': {
        const { winnerId } = p as { winnerId: string };
        setGameOver(true);
        setGameWinnerId(winnerId);
        setSharedState(prev => ({ ...prev, phase: 'gameOver' }));
        setView('gameOver');
        break;
      }

      case 'NEXT_ROUND': {
        // Non-hosts reset state here; host resets directly in startRound()
        // (the host's own broadcast echoes back but must not overwrite the new deal)
        if (!isHost) {
          setMyState(null);
          setMyRoundScore(0);
          setPendingFoundationCards(new Set());
        }
        break;
      }

      // Host-only messages
      case 'PLAY_TO_FOUNDATION': {
        if (!isHost) break;
        const { cardId, suit, value, playerId, card } = p as {
          cardId: string;
          suit: Suit;
          value: number;
          playerId: string;
          card: Card;
        };
        handleHostFoundationPlay(cardId, suit, value, playerId, card, from);
        break;
      }

      case 'FINAL_NERTS_COUNT': {
        if (!isHost || !hostStateRef.current) break;
        const { count, playerId: reportingPlayer } = p as { count: number; playerId: string };
        hostStateRef.current.finalCountsReceived[reportingPlayer] = count;

        const allPlayers = Object.keys(hostStateRef.current.nertsCounts);
        const allReported = allPlayers.every(pid => hostStateRef.current!.finalCountsReceived[pid] !== undefined);
        if (allReported) {
          if (hostStateRef.current.roundEndTimer) {
            clearTimeout(hostStateRef.current.roundEndTimer);
            hostStateRef.current.roundEndTimer = null;
          }
          resolveRound();
        }
        break;
      }

      case 'NERTS_PILE_COUNT_BROADCAST': {
        // From a player to host, forwarded for others
        if (!isHost) break;
        const { count, playerId: reportingPlayer } = p as { count: number; playerId: string };
        if (hostStateRef.current) {
          hostStateRef.current.nertsCounts[reportingPlayer] = count;
          if (count === 0 && !hostStateRef.current.waitingForFinalCounts) {
            hostStateRef.current.waitingForFinalCounts = true;
            hostStateRef.current.nertsCallerId = reportingPlayer;
            broadcastAll('NERTS', { winnerId: reportingPlayer });
            hostStateRef.current.roundEndTimer = setTimeout(() => resolveRound(), 2000);
          }
        }
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, myPlayerId]);

  const { send } = useWebSocket(
    wsUrl,
    handleMessage,
    () => console.log('WS connected'),
    () => console.log('WS disconnected'),
  );

  // Helper to send to host
  const sendToHost = useCallback((type: string, payload: unknown) => {
    send(hostPlayerId, type, payload);
  }, [send, hostPlayerId]);

  // Helper to broadcast to all
  const broadcastAll = useCallback((type: string, payload: unknown) => {
    send('all', type, payload);
  }, [send]);

  // Helper to send to specific player
  const sendToPlayer = useCallback((playerId: string, type: string, payload: unknown) => {
    send(playerId, type, payload);
  }, [send]);

  // Send nerts pile count broadcast
  const sendNertsPileCount = useCallback((count: number) => {
    if (isHost) {
      // Process locally
      if (hostStateRef.current) {
        hostStateRef.current.nertsCounts[myPlayerId] = count;
        if (count === 0 && !hostStateRef.current.waitingForFinalCounts) {
          hostStateRef.current.waitingForFinalCounts = true;
          hostStateRef.current.nertsCallerId = myPlayerId;
          broadcastAll('NERTS', { winnerId: myPlayerId });
          hostStateRef.current.roundEndTimer = setTimeout(() => resolveRound(), 2000);
        }
      }
      // Broadcast count to all players
      broadcastAll('NERTS_PILE_COUNT', { count, playerId: myPlayerId });
    } else {
      // Send to host for validation, also broadcast count directly
      sendToHost('NERTS_PILE_COUNT_BROADCAST', { count, playerId: myPlayerId });
      send('all', 'NERTS_PILE_COUNT', { count, playerId: myPlayerId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, myPlayerId, broadcastAll, sendToHost, send]);

  // Host: handle foundation play request
  function handleHostFoundationPlay(
    cardId: string,
    suit: Suit,
    value: number,
    playerId: string,
    card: Card,
    _from: string,
  ) {
    if (!hostStateRef.current) return;

    let valid = false;
    if (value === 1) {
      // Ace: start a new pile
      hostStateRef.current.foundations.push([card]);
      valid = true;
    } else {
      // Find existing pile of same suit where this card continues the sequence
      const pile = hostStateRef.current.foundations.find(
        p => p.length > 0 && p[0].suit === suit && p[p.length - 1].value === value - 1
      );
      if (pile) {
        pile.push(card);
        valid = true;
      }
    }

    if (valid) {
      hostStateRef.current.roundScores[playerId] = (hostStateRef.current.roundScores[playerId] ?? 0) + 1;

      const foundations = [...hostStateRef.current.foundations];
      const roundScores = { ...hostStateRef.current.roundScores };

      setSharedState(prev => ({
        ...prev,
        foundations,
        players: prev.players.map(pl => ({
          ...pl,
          foundationScore: roundScores[pl.playerId] ?? pl.foundationScore,
        })),
      }));

      if (playerId === myPlayerId) {
        setMyRoundScore(roundScores[myPlayerId] ?? 0);
        setPendingFoundationCards(prev => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        setMyState(prev => {
          if (!prev) return prev;
          let newWaste = prev.waste;
          if (prev.waste.length > 0 && prev.waste[prev.waste.length - 1].id === cardId) {
            newWaste = prev.waste.slice(0, -1);
          }
          const newWorkPiles = prev.workPiles.map(p2 => {
            if (p2.length > 0 && p2[p2.length - 1].id === cardId) return p2.slice(0, -1);
            return p2;
          });
          let newNerts = prev.nertsPile;
          if (prev.nertsPile.length > 0 && prev.nertsPile[prev.nertsPile.length - 1].id === cardId) {
            newNerts = prev.nertsPile.slice(0, -1);
            const newCount = newNerts.length;
            setTimeout(() => sendNertsPileCount(newCount), 0);
          }
          return { ...prev, waste: newWaste, workPiles: newWorkPiles, nertsPile: newNerts };
        });
      }

      broadcastAll('FOUNDATION_UPDATE', { foundations, roundScores });
    } else {
      sendToPlayer(playerId, 'FOUNDATION_REJECTED', { cardId });
    }
  }

  // Host: resolve round and calculate scores
  function resolveRound() {
    if (!hostStateRef.current) return;
    const hs = hostStateRef.current;

    const roundScores: Record<string, number> = {};
    const penalties: Record<string, number> = {};
    const newCumulative = { ...hs.cumulativeScores };

    const allPlayerIds = Object.keys(hs.nertsCounts);
    allPlayerIds.forEach(pid => {
      const foundationCards = hs.roundScores[pid] ?? 0;
      const nertsLeft = hs.finalCountsReceived[pid] ?? hs.nertsCounts[pid] ?? 0;
      penalties[pid] = nertsLeft;
      const score = foundationCards - 2 * nertsLeft;
      roundScores[pid] = score;
      newCumulative[pid] = (newCumulative[pid] ?? 0) + score;
    });

    hs.cumulativeScores = newCumulative;
    cumulativeScoresRef.current = newCumulative;

    // Update shared state for host
    setSharedState(prev => ({
      ...prev,
      phase: 'roundEnd',
      cumulativeScores: newCumulative,
      players: prev.players.map(pl => ({
        ...pl,
        foundationScore: roundScores[pl.playerId] ?? pl.foundationScore,
        nertsPileCount: penalties[pl.playerId] ?? pl.nertsPileCount,
      })),
    }));
    setView('roundEnd');

    broadcastAll('ROUND_RESULTS', { roundScores, penalties, cumulativeScores: newCumulative });

    // Check game over
    const winner = Object.entries(newCumulative).find(([, score]) => score >= 100);
    if (winner) {
      setGameOver(true);
      setGameWinnerId(winner[0]);
      setSharedState(prev => ({ ...prev, phase: 'gameOver' }));
      broadcastAll('GAME_OVER', { winnerId: winner[0] });
    }
  }

  // --- Join room ---
  function handleJoinRoom(rId: string, pId: string, pName: string, host: boolean, hPlayerId: string) {
    setRoomId(rId);
    setMyPlayerId(pId);
    setMyName(pName);
    setIsHost(host);
    setHostPlayerId(hPlayerId);
    setPlayerNames(prev => ({ ...prev, [pId]: pName }));
    cumulativeScoresRef.current = {};

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrlVal = `${proto}://${window.location.host}/ws?roomId=${rId}&playerId=${pId}&playerName=${encodeURIComponent(pName)}`;
    setWsUrl(wsUrlVal);
    setView('waiting');

    // If joining as non-host, wait for PLAYER_LIST; if host, start with self
    if (host) {
      setWaitingPlayers([{ playerId: pId, name: pName }]);
    }
  }

  // Broadcast my player list (host only) — called after WS connects
  const broadcastPlayerList = useCallback(() => {
    if (!isHost) return;
    broadcastAll('PLAYER_LIST', waitingPlayers);
  }, [isHost, broadcastAll, waitingPlayers]);

  // When a new player joins (host receives via PLAYER_LIST from server)
  // The server handles broadcasting player joins; we just listen

  // --- Host: start round ---
  function startRound() {
    const players = waitingPlayers;
    const playerIds = players.map(p => p.playerId);

    // Build player round info
    const playerInfos: PlayerRoundInfo[] = players.map((p, i) => ({
      playerId: p.playerId,
      name: p.name,
      nertsPileCount: 13,
      foundationScore: 0,
      backColor: BACK_COLORS[i % BACK_COLORS.length],
    }));

    const roundScores: Record<string, number> = {};
    const nertsCounts: Record<string, number> = {};
    playerIds.forEach(pid => {
      roundScores[pid] = 0;
      nertsCounts[pid] = 13;
    });

    hostStateRef.current = {
      foundations: buildEmptyFoundations(),
      roundScores,
      cumulativeScores: { ...cumulativeScoresRef.current },
      nertsCounts,
      waitingForFinalCounts: false,
      finalCountsReceived: {},
      roundEndTimer: null,
      nertsCallerId: null,
    };

    // Deal to each player
    players.forEach((player, i) => {
      const deal = dealPlayer(player.playerId, i);
      if (player.playerId === myPlayerId) {
        // Host sets their own state locally
        setMyState(buildPrivateState(deal));
        setMyRoundScore(0);
        setPendingFoundationCards(new Set());
      } else {
        sendToPlayer(player.playerId, 'DEAL', deal);
      }
    });

    // Update names map
    setPlayerNames(prev => {
      const next = { ...prev };
      players.forEach(p => { next[p.playerId] = p.name; });
      return next;
    });

    // Broadcast round start
    broadcastAll('ROUND_START', { players: playerInfos });

    // Update host's own shared state
    setSharedState({
      phase: 'playing',
      foundations: buildEmptyFoundations(),
      players: playerInfos,
      cumulativeScores: { ...cumulativeScoresRef.current },
      roundNumber: sharedState.roundNumber + 1,
      nertsCallerId: null,
      targetScore: 100,
    });
    setGameOver(false);
    setGameWinnerId(null);
    setView('playing');
  }

  // Host: next round
  function handleNextRound() {
    broadcastAll('NEXT_ROUND', {});
    startRound();
  }

  // Host: play again (game over reset)
  function handlePlayAgain() {
    cumulativeScoresRef.current = {};
    setSharedState(prev => ({ ...prev, cumulativeScores: {}, roundNumber: 0 }));
    broadcastAll('NEXT_ROUND', {});
    startRound();
  }

  // --- Local move functions ---

  function moveNertsToWorkPile(pileIndex: number) {
    setMyState(prev => {
      if (!prev || prev.nertsPile.length === 0) return prev;
      const card = prev.nertsPile[prev.nertsPile.length - 1];
      if (!canPlayOnWorkPile(card, prev.workPiles[pileIndex])) return prev;
      const newNerts = prev.nertsPile.slice(0, -1);
      const newPiles = prev.workPiles.map((p, i) => i === pileIndex ? [...p, card] : p);
      setTimeout(() => sendNertsPileCount(newNerts.length), 0);
      return { ...prev, nertsPile: newNerts, workPiles: newPiles };
    });
  }

  function moveWasteToWorkPile(pileIndex: number) {
    setMyState(prev => {
      if (!prev || prev.waste.length === 0) return prev;
      const card = prev.waste[prev.waste.length - 1];
      if (!canPlayOnWorkPile(card, prev.workPiles[pileIndex])) return prev;
      const newWaste = prev.waste.slice(0, -1);
      const newPiles = prev.workPiles.map((p, i) => i === pileIndex ? [...p, card] : p);
      return { ...prev, waste: newWaste, workPiles: newPiles };
    });
  }

  function moveWorkPileToWorkPile(fromIndex: number, cardIndex: number, toIndex: number) {
    setMyState(prev => {
      if (!prev) return prev;
      const fromPile = prev.workPiles[fromIndex];
      const sequence = fromPile.slice(cardIndex);
      const toPile = prev.workPiles[toIndex];

      if (sequence.length === 0) return prev;
      const bottomCard = sequence[0];
      if (!canPlayOnWorkPile(bottomCard, toPile)) return prev;

      const newWorkPiles = prev.workPiles.map((p, i) => {
        if (i === fromIndex) return p.slice(0, cardIndex);
        if (i === toIndex) return [...p, ...sequence];
        return p;
      });
      return { ...prev, workPiles: newWorkPiles };
    });
  }

  function flipHand() {
    setMyState(prev => {
      if (!prev) return prev;
      if (prev.hand.length > 0) {
        // Flip up to 3 cards from hand to waste (only the top is playable)
        const count = Math.min(3, prev.hand.length);
        const flipped = prev.hand.slice(0, count);
        return {
          ...prev,
          hand: prev.hand.slice(count),
          waste: [...prev.waste, ...flipped],
        };
      } else {
        // Hand empty: flip waste face-down to become new hand
        if (prev.waste.length === 0) return prev;
        const newHand = [...prev.waste].reverse();
        return { ...prev, hand: newHand, waste: [] };
      }
    });
  }

  function playCardToFoundation(card: Card, source: Selection) {
    if (!source) return;

    if (!canPlayToFoundation(card, sharedState.foundations)) return;

    if (isHost) {
      // Process locally immediately
      handleHostFoundationPlay(card.id, card.suit, card.value, myPlayerId, card, myPlayerId);
    } else {
      // Mark as pending and send to host
      setPendingFoundationCards(prev => new Set(prev).add(card.id));
      sendToHost('PLAY_TO_FOUNDATION', {
        cardId: card.id,
        suit: card.suit,
        value: card.value,
        playerId: myPlayerId,
        card,
      });

      // Card stays visible (marked pending) until host confirms or rejects.
      // FOUNDATION_UPDATE will remove it from whichever pile it's on upon confirmation.
    }
  }

  // --- Render ---

  if (view === 'lobby') {
    return <Lobby onJoinRoom={handleJoinRoom} />;
  }

  if (view === 'waiting') {
    return (
      <div className="waiting-room">
        <div className="waiting-panel">
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#4ade80', marginBottom: 8, textAlign: 'center' }}>
            ♠ Nerts! ♥
          </h1>
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Room Code</div>
            <div className="room-code">{roomId}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
              Players ({waitingPlayers.length})
            </div>
            {waitingPlayers.map(p => (
              <div key={p.playerId} className="player-list-item">
                <span>{p.name}</span>
                {p.playerId === hostPlayerId && (
                  <span className="host-badge">HOST</span>
                )}
                {p.playerId === myPlayerId && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>(you)</span>
                )}
              </div>
            ))}
          </div>

          {isHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="primary"
                style={{ padding: '14px', fontSize: 16 }}
                onClick={startRound}
                disabled={waitingPlayers.length < 1}
              >
                Start Game ({waitingPlayers.length} player{waitingPlayers.length !== 1 ? 's' : ''})
              </button>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                Need 2–4 players (can solo to test)
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    );
  }

  if ((view === 'playing' || view === 'roundEnd' || view === 'gameOver') && myState) {
    return (
      <GameBoard
        myPlayerId={myPlayerId}
        myName={myName}
        myState={myState}
        sharedState={sharedState}
        myRoundScore={myRoundScore}
        pendingFoundationCards={pendingFoundationCards}
        flashMessage={flashMessage}
        isHost={isHost}
        gameOver={gameOver}
        gameWinnerId={gameWinnerId}
        playerNames={playerNames}
        onMoveNertsToWorkPile={moveNertsToWorkPile}
        onMoveWasteToWorkPile={moveWasteToWorkPile}
        onMoveWorkPileToWorkPile={moveWorkPileToWorkPile}
        onPlayToFoundation={playCardToFoundation}
        onFlip={flipHand}
        onNextRound={handleNextRound}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // Loading/transitional state
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', color: 'white' }}>
      Loading...
    </div>
  );
}
