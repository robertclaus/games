import React from 'react';
import { PublicGameState, PrivatePlayerState, SurvivorInstance, LocationId, LOCATION_NAMES, ItemCard } from '../game/types';
import { SURVIVORS } from '../game/content';
import { LocationPanel } from './LocationPanel';
import { SurvivorPanel } from './SurvivorPanel';
import { HandPanel } from './HandPanel';
import { CrisisPanel } from './CrisisPanel';
import { CrossroadsModal } from './CrossroadsModal';
import { ExileModal } from './ExileModal';
import { GameLog } from './GameLog';

interface GameBoardProps {
  publicState: PublicGameState;
  privateState: PrivatePlayerState | null;
  myPlayerId: string;
  isHost: boolean;
  hostPlayerId: string;
  onAction: (action: object) => void;
}

export function GameBoard({ publicState, privateState, myPlayerId, isHost: _isHost, hostPlayerId: _hostPlayerId, onAction }: GameBoardProps) {
  const myPlayerState = publicState.players.find(p => p.playerId === myPlayerId);
  const currentPlayer = publicState.players[publicState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.playerId === myPlayerId;

  const mySurvivorIds = myPlayerState?.survivorIds ?? [];
  const mySurvivors = mySurvivorIds
    .map(id => publicState.survivors[id])
    .filter(Boolean) as SurvivorInstance[];

  const canAct = isMyTurn && publicState.turnSubPhase === 'acting';

  function handleRollDice() {
    onAction({ type: 'ROLL_DICE' });
  }

  function handleEndTurn() {
    onAction({ type: 'END_TURN' });
  }

  return (
    <div style={styles.container}>
      {/* Top bar: morale, food, round */}
      <div style={styles.topBar}>
        <Stat label="Round" value={`${publicState.round} / ${publicState.maxRounds}`} />
        <Stat label="Morale" value={`${'❤️'.repeat(Math.max(0, publicState.morale))}`} small />
        <Stat label="Food" value={String(publicState.food)} />
        <Stat label="Waste" value={String(publicState.wasteCount)} />
        <Stat label="Starvation" value={String(publicState.starvationTokens)} danger />
        <div style={styles.scenarioTag}>{publicState.scenarioName}</div>
      </div>

      <div style={styles.main}>
        {/* Left column: locations */}
        <div style={styles.leftCol}>
          <div style={styles.sectionLabel}>Locations</div>
          {Object.entries(publicState.locations).map(([locId, locState]) => (
            <LocationPanel
              key={locId}
              locationId={locId as LocationId}
              locationState={locState}
              survivors={Object.values(publicState.survivors).filter(s => s.location === locId)}
              canAct={canAct}
              mySurvivorIds={mySurvivorIds}
              actionDice={myPlayerState?.actionDice ?? []}
              diceSpent={myPlayerState?.diceSpent ?? []}
              onAction={onAction}
            />
          ))}
        </div>

        {/* Center column: my survivors + hand */}
        <div style={styles.centerCol}>
          <div style={styles.sectionLabel}>Your Survivors</div>
          <SurvivorPanel
            survivors={mySurvivors}
            actionDice={myPlayerState?.actionDice ?? []}
            diceSpent={myPlayerState?.diceSpent ?? []}
            canAct={canAct}
            allLocations={publicState.locations}
            onAction={onAction}
          />

          <div style={{ marginTop: 16 }}>
            <div style={styles.sectionLabel}>Your Hand</div>
            <HandPanel
              hand={privateState?.hand ?? []}
              canAct={canAct || (currentPlayer?.playerId === myPlayerId)}
              onContributeCrisis={(cardId: string) => onAction({ type: 'CONTRIBUTE_TO_CRISIS', cardId })}
              onPlayItem={(cardId: string, targetSurvivorId?: string) =>
                onAction({ type: 'PLAY_ITEM', cardId, targetSurvivorId })
              }
              onEquipItem={(cardId: string, survivorId: string) =>
                onAction({ type: 'EQUIP_ITEM', cardId, survivorId })
              }
              mySurvivorIds={mySurvivorIds}
              hasCrisis={!!publicState.currentCrisis}
              hasContributed={myPlayerState?.hasContributedToCrisis ?? false}
            />
          </div>

          {/* Turn controls */}
          {isMyTurn && (
            <div style={styles.turnControls}>
              {publicState.turnSubPhase === 'rolling' && (
                <button style={styles.btnRoll} onClick={handleRollDice}>
                  🎲 Roll Dice
                </button>
              )}
              {publicState.turnSubPhase === 'acting' && (
                <button style={styles.btnEnd} onClick={handleEndTurn}>
                  End Turn
                </button>
              )}
            </div>
          )}

          {/* Current turn indicator */}
          {!isMyTurn && currentPlayer && (
            <div style={styles.turnIndicator}>
              {currentPlayer.name}'s turn ({publicState.turnSubPhase})
            </div>
          )}
        </div>

        {/* Right column: crisis, players, log */}
        <div style={styles.rightCol}>
          <CrisisPanel
            crisis={publicState.currentCrisis}
            poolCount={publicState.crisisPoolCount}
          />

          <div style={{ marginTop: 16 }}>
            <div style={styles.sectionLabel}>Players</div>
            {publicState.players.map(p => (
              <PlayerStrip
                key={p.playerId}
                name={p.name}
                isCurrent={p.playerId === currentPlayer?.playerId}
                isMe={p.playerId === myPlayerId}
                isExiled={p.isExiled}
                handCount={p.handCount}
                hasTakenTurn={p.hasTakenTurn}
                hasContributed={p.hasContributedToCrisis}
                actionDice={p.actionDice}
                diceSpent={p.diceSpent}
                survivorIds={p.survivorIds}
                survivors={publicState.survivors}
                canExile={isMyTurn && canAct && p.playerId !== myPlayerId && !p.isExiled}
                onExile={() => onAction({ type: 'INITIATE_EXILE', targetPlayerId: p.playerId })}
              />
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <GameLog log={publicState.log} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {publicState.activeCrossroads && (
        <CrossroadsModal
          activeCrossroads={publicState.activeCrossroads}
          myPlayerId={myPlayerId}
          onVote={(optionIndex: 0 | 1) => onAction({ type: 'CROSSROADS_VOTE', optionIndex })}
        />
      )}

      {publicState.activeExileVote && (
        <ExileModal
          vote={publicState.activeExileVote}
          myPlayerId={myPlayerId}
          players={publicState.players}
          onVote={(v: boolean) => onAction({ type: 'EXILE_VOTE', vote: v })}
        />
      )}

      {/* Search pending */}
      {publicState.pendingSearch && publicState.pendingSearch.drawnCards.length > 0 &&
        currentPlayer?.playerId === myPlayerId && (
          <SearchModal
            cards={publicState.pendingSearch.drawnCards}
            onDecide={(keepIndex: number | null) =>
              onAction({ type: 'SEARCH_DECIDE', keepCardIndex: keepIndex })
            }
          />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Stat({ label, value, small, danger }: { label: string; value: string; small?: boolean; danger?: boolean }) {
  return (
    <div style={styles.stat}>
      <span style={{ ...styles.statLabel, color: danger ? '#e57373' : '#888' }}>{label}</span>
      <span style={{ ...styles.statValue, fontSize: small ? '0.75rem' : '1.1rem' }}>{value}</span>
    </div>
  );
}

interface PlayerStripProps {
  name: string;
  isCurrent: boolean;
  isMe: boolean;
  isExiled: boolean;
  handCount: number;
  hasTakenTurn: boolean;
  hasContributed: boolean;
  actionDice: number[];
  diceSpent: boolean[];
  survivorIds: string[];
  survivors: Record<string, SurvivorInstance>;
  canExile: boolean;
  onExile: () => void;
}

function PlayerStrip({ name, isCurrent, isMe, isExiled, handCount, hasTakenTurn, hasContributed, actionDice, diceSpent, survivorIds, survivors, canExile, onExile }: PlayerStripProps) {
  return (
    <div style={{
      ...styles.playerStrip,
      borderColor: isCurrent ? '#f57c00' : isMe ? '#0f3460' : '#333',
      opacity: isExiled ? 0.5 : 1,
    }}>
      <div style={styles.playerStripHeader}>
        <span style={styles.playerStripName}>{name}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {isMe && <Tag color="#0f3460">You</Tag>}
          {isCurrent && <Tag color="#f57c00">Turn</Tag>}
          {isExiled && <Tag color="#555">Exiled</Tag>}
          {hasContributed && <Tag color="#388e3c">Crisis ✓</Tag>}
          {hasTakenTurn && !isCurrent && <Tag color="#333">Done</Tag>}
        </div>
      </div>
      <div style={styles.playerStripDetails}>
        <span style={{ color: '#888', fontSize: '0.8rem' }}>🃏 {handCount}</span>
        {actionDice.map((d, i) => (
          <span key={i} style={{
            ...styles.dieChip,
            opacity: diceSpent[i] ? 0.3 : 1,
          }}>{d}</span>
        ))}
        {/* Survivor health */}
        {survivorIds.map(id => {
          const surv = survivors[id];
          if (!surv) return null;
          const card = SURVIVORS.find(s => s.id === surv.cardId);
          return (
            <span key={id} style={{ fontSize: '0.75rem', color: surv.wounds >= 3 ? '#e57373' : '#aaa' }}>
              {card?.name.split(' ')[0] ?? '?'} {'❤️'.repeat(Math.max(0, 3 - surv.wounds))}
            </span>
          );
        })}
      </div>
      {canExile && (
        <button style={styles.btnExile} onClick={onExile}>Exile</button>
      )}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ background: color, color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem' }}>
      {children}
    </span>
  );
}

function SearchModal({ cards, onDecide }: { cards: ItemCard[]; onDecide: (i: number | null) => void }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalTitle}>Search Results</div>
        <p style={{ color: '#aaa', marginBottom: 12 }}>Pick one card to keep, or take noise instead:</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {cards.map((card, i) => (
            <button key={card.id} style={styles.itemCard} onClick={() => onDecide(i)}>
              <div style={styles.itemType}>{card.type}</div>
              <div style={{ fontWeight: 600 }}>{card.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{card.description}</div>
            </button>
          ))}
        </div>
        <button style={styles.btnSecondary} onClick={() => onDecide(null)}>
          Take noise instead (keep nothing)
        </button>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '12px 24px',
    background: '#16213e',
    borderBottom: '1px solid #0f3460',
  },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statLabel: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontWeight: 700, color: '#e0e0e0' },
  scenarioTag: {
    marginLeft: 'auto',
    color: '#888',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  main: {
    display: 'flex',
    flex: 1,
    gap: 12,
    padding: 12,
    overflow: 'auto',
  },
  leftCol: { width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  centerCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  rightCol: { width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  sectionLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#555',
    marginBottom: 4,
  },
  turnControls: { display: 'flex', gap: 8, marginTop: 12 },
  btnRoll: {
    padding: '10px 20px',
    background: '#1565c0',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '1rem',
  },
  btnEnd: {
    padding: '10px 20px',
    background: '#8b1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '1rem',
  },
  turnIndicator: {
    color: '#888',
    fontSize: '0.9rem',
    fontStyle: 'italic',
    marginTop: 12,
  },
  playerStrip: {
    background: '#16213e',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '8px 10px',
    marginBottom: 4,
  },
  playerStripHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerStripName: { fontWeight: 600, fontSize: '0.9rem' },
  playerStripDetails: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  dieChip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 4,
    background: '#0f3460',
    color: '#90caf9',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  btnExile: {
    marginTop: 6,
    padding: '3px 10px',
    background: '#4a1010',
    color: '#ff8a80',
    border: '1px solid #8b1a1a',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 12,
    padding: 32,
    maxWidth: 480,
    width: '90%',
  },
  modalTitle: { fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 },
  itemCard: {
    background: '#0d1117',
    border: '1px solid #0f3460',
    borderRadius: 6,
    padding: '8px 12px',
    cursor: 'pointer',
    color: '#e0e0e0',
    textAlign: 'left',
    minWidth: 120,
  },
  itemType: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: 2,
  },
  btnSecondary: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #555',
    borderRadius: 6,
    color: '#aaa',
    cursor: 'pointer',
  },
};
