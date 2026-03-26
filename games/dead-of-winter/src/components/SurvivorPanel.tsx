import React from 'react';
import { SurvivorInstance, LocationId, LOCATION_NAMES } from '../game/types';
import { SURVIVORS, ALL_ITEMS } from '../game/content';

type LocationsPublic = Record<LocationId, {
  id: LocationId;
  zombies: number;
  barricades: number;
  maxBarricades: number;
  noiseTokens: number;
  maxNoise: number;
  deckCount: number;
}>;

interface SurvivorPanelProps {
  survivors: SurvivorInstance[];
  actionDice: number[];
  diceSpent: boolean[];
  canAct: boolean;
  allLocations: LocationsPublic;
  onAction: (action: object) => void;
}

export function SurvivorPanel({ survivors, actionDice, diceSpent, canAct, allLocations, onAction }: SurvivorPanelProps) {
  if (survivors.length === 0) {
    return <div style={styles.empty}>No survivors</div>;
  }

  const availableDiceIndices = actionDice
    .map((_, i) => i)
    .filter(i => !diceSpent[i]);

  return (
    <div style={styles.container}>
      {survivors.map(s => {
        const card = SURVIVORS.find(c => c.id === s.cardId);
        const sid = `${s.cardId}_${s.ownerId}`;
        const isDead = s.wounds >= 3;

        return (
          <div key={sid} style={{ ...styles.card, opacity: isDead ? 0.4 : 1 }}>
            <div style={styles.header}>
              <span style={styles.name}>{card?.name ?? s.cardId}</span>
              <span style={styles.location}>{LOCATION_NAMES[s.location]}</span>
              {s.isLeader && <span style={styles.leaderBadge}>Leader</span>}
              {isDead && <span style={styles.deadBadge}>Dead</span>}
            </div>

            {/* Wounds */}
            <div style={styles.woundRow}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: i < s.wounds ? '#e57373' : '#333',
                  display: 'inline-block',
                  marginRight: 3,
                }} />
              ))}
              {s.frostbiteWounds > 0 && (
                <span style={styles.frostbite}>❄️×{s.frostbiteWounds}</span>
              )}
            </div>

            {/* Card stats */}
            {card && (
              <div style={styles.stats}>
                <span style={styles.stat}>ATK ≥{card.attack}</span>
                <span style={styles.stat}>SRCH ≥{card.search}</span>
                <span style={styles.ability}>{card.abilityDescription}</span>
              </div>
            )}

            {/* Equipped item */}
            {s.equippedItemId && (
              <div style={styles.equippedTag}>
                ⚔️ {ALL_ITEMS.find(i => i.id === s.equippedItemId)?.name ?? s.equippedItemId}
              </div>
            )}

            {/* Move actions */}
            {canAct && !isDead && (
              <div style={styles.moveRow}>
                {Object.keys(allLocations).filter(loc => loc !== s.location).map(loc => (
                  <button
                    key={loc}
                    style={styles.moveBtn}
                    onClick={() => onAction({ type: 'MOVE_SURVIVOR', survivorId: sid, targetLocation: loc as LocationId })}
                  >
                    → {LOCATION_NAMES[loc as LocationId]}
                  </button>
                ))}
              </div>
            )}

            {/* Dice actions at current location */}
            {canAct && !isDead && s.location !== 'colony' && availableDiceIndices.length > 0 && (
              <div style={styles.actionRow}>
                {availableDiceIndices.map(i => (
                  <React.Fragment key={i}>
                    <button style={styles.actionBtn} onClick={() => onAction({ type: 'ATTACK_ZOMBIE', survivorId: sid, dieIndex: i })}>
                      Attack [{actionDice[i]}]
                    </button>
                    <button style={styles.actionBtn} onClick={() => onAction({ type: 'SEARCH', survivorId: sid, dieIndex: i })}>
                      Search [{actionDice[i]}]
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {canAct && !isDead && availableDiceIndices.length > 0 && (
              <div style={styles.actionRow}>
                {availableDiceIndices.map(i => (
                  <button key={i} style={styles.actionBtnAlt} onClick={() => onAction({ type: 'CLEAN_WASTE', survivorId: sid, dieIndex: i })}>
                    Clean Waste [{actionDice[i]}]
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { color: '#555', fontSize: '0.9rem', fontStyle: 'italic' },
  card: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 8,
    padding: '10px 12px',
  },
  header: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 },
  name: { fontWeight: 700, fontSize: '0.95rem' },
  location: { color: '#888', fontSize: '0.8rem', marginLeft: 'auto' },
  leaderBadge: {
    background: '#f57c00',
    color: '#fff',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: '0.7rem',
  },
  deadBadge: {
    background: '#4a1010',
    color: '#e57373',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: '0.7rem',
  },
  woundRow: { display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 },
  frostbite: { color: '#90caf9', fontSize: '0.75rem', marginLeft: 4 },
  stats: { display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  stat: { color: '#aaa', fontSize: '0.75rem' },
  ability: { color: '#7986cb', fontSize: '0.75rem', fontStyle: 'italic' },
  equippedTag: { color: '#ffb74d', fontSize: '0.8rem', marginBottom: 4 },
  moveRow: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 },
  moveBtn: {
    padding: '3px 8px',
    background: '#1a3a1a',
    color: '#81c784',
    border: '1px solid #388e3c',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  actionRow: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 },
  actionBtn: {
    padding: '3px 8px',
    background: '#4a1010',
    color: '#ef9a9a',
    border: '1px solid #c62828',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  actionBtnAlt: {
    padding: '3px 8px',
    background: '#1a1a3e',
    color: '#90caf9',
    border: '1px solid #0f3460',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};
