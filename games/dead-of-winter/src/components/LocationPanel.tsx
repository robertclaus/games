import React, { useState } from 'react';
import { LocationId, LOCATION_NAMES, SurvivorInstance } from '../game/types';
import { SURVIVORS } from '../game/content';

type LocationStatePublic = {
  id: LocationId;
  zombies: number;
  barricades: number;
  maxBarricades: number;
  noiseTokens: number;
  maxNoise: number;
  deckCount: number;
};

interface LocationPanelProps {
  locationId: LocationId;
  locationState: LocationStatePublic;
  survivors: SurvivorInstance[];  // all survivors AT this location
  canAct: boolean;
  mySurvivorIds: string[];
  actionDice: number[];
  diceSpent: boolean[];
  onAction: (action: object) => void;
}

export function LocationPanel({
  locationId, locationState, survivors, canAct, mySurvivorIds, actionDice, diceSpent, onAction
}: LocationPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // My survivors currently at this location
  const myHereSurvivors = survivors.filter(s =>
    mySurvivorIds.some(id => id === `${s.cardId}_${s.ownerId}`)
  );

  // Available (unspent) die indices
  const availableDiceIndices = actionDice
    .map((_, i) => i)
    .filter(i => !diceSpent[i]);

  const hasActions = canAct && myHereSurvivors.length > 0 && locationId !== 'colony';

  return (
    <div style={{
      ...styles.panel,
      borderColor: locationId === 'colony' ? '#f57c00' : '#0f3460',
    }}>
      {/* Header — click to expand actions */}
      <div
        style={{ ...styles.header, cursor: hasActions ? 'pointer' : 'default' }}
        onClick={() => hasActions && setExpanded(!expanded)}
      >
        <div style={styles.name}>
          {LOCATION_ICON[locationId]} {LOCATION_NAMES[locationId]}
          {hasActions && <span style={styles.expandCaret}>{expanded ? '▲' : '▼'}</span>}
        </div>
        <div style={styles.stats}>
          <Pip label="🧟" count={locationState.zombies} danger={locationState.zombies >= 5} />
          <Pip label="🔒" count={locationState.barricades} max={locationState.maxBarricades} />
          <Pip label="📦" count={locationState.deckCount} />
        </div>
      </div>

      {/* Survivors present at this location */}
      {survivors.length > 0 && (
        <div style={styles.survivorRow}>
          {survivors.map(s => {
            const card = SURVIVORS.find(c => c.id === s.cardId);
            const isMe = mySurvivorIds.some(id => id === `${s.cardId}_${s.ownerId}`);
            return (
              <span key={`${s.cardId}_${s.ownerId}`} style={{
                ...styles.survivorChip,
                background: isMe ? '#1565c0' : '#333',
                opacity: s.wounds >= 3 ? 0.4 : 1,
              }}>
                {card?.name.split(' ')[0] ?? '?'}
                {s.wounds > 0 && ` (${s.wounds}w)`}
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded: action buttons for my survivors here */}
      {expanded && hasActions && (
        <div style={styles.actions}>
          {myHereSurvivors.map(s => {
            if (s.wounds >= 3) return null; // skip dead survivors
            const sid = `${s.cardId}_${s.ownerId}`;
            const card = SURVIVORS.find(c => c.id === s.cardId);
            return (
              <div key={sid} style={styles.survivorActions}>
                <span style={styles.survivorActionsLabel}>{card?.name.split(' ')[0]}</span>
                {availableDiceIndices.map(i => (
                  <React.Fragment key={i}>
                    <ActionBtn
                      label={`Attack [${actionDice[i]}]`}
                      onClick={() => onAction({ type: 'ATTACK_ZOMBIE', survivorId: sid, dieIndex: i })}
                    />
                    <ActionBtn
                      label={`Search [${actionDice[i]}]`}
                      onClick={() => onAction({ type: 'SEARCH', survivorId: sid, dieIndex: i })}
                    />
                    <ActionBtn
                      label={`Waste [${actionDice[i]}]`}
                      onClick={() => onAction({ type: 'CLEAN_WASTE', survivorId: sid, dieIndex: i })}
                    />
                    {locationState.barricades < locationState.maxBarricades && (
                      <ActionBtn
                        label={`Barricade [${actionDice[i]}]`}
                        onClick={() => onAction({ type: 'BARRICADE', survivorId: sid, dieIndex: i })}
                      />
                    )}
                  </React.Fragment>
                ))}
                {locationState.barricades < locationState.maxBarricades &&
                  card?.abilityType === 'free_barricade' &&
                  !s.hasUsedFreeAbilityThisTurn && (
                  <ActionBtn
                    label="Barricade (free)"
                    onClick={() => onAction({ type: 'BARRICADE', survivorId: sid, dieIndex: null })}
                  />
                )}
              </div>
            );
          })}
          {myHereSurvivors.every(s => s.wounds >= 3) && (
            <span style={{ color: '#555', fontSize: '0.8rem' }}>All your survivors here are dead</span>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button style={styles.actionBtn} onClick={e => { e.stopPropagation(); onClick(); }}>
      {label}
    </button>
  );
}

function Pip({ label, count, max, danger }: { label: string; count: number; max?: number; danger?: boolean }) {
  return (
    <span style={{ fontSize: '0.8rem', color: danger ? '#e57373' : '#aaa' }}>
      {label}{count}{max !== undefined ? `/${max}` : ''}
    </span>
  );
}

const LOCATION_ICON: Record<LocationId, string> = {
  colony: '🏠',
  police_station: '🚔',
  grocery_store: '🛒',
  school: '🏫',
  library: '📚',
  hospital: '🏥',
  gas_station: '⛽',
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 6,
    padding: 8,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 },
  expandCaret: { color: '#555', fontSize: '0.7rem' },
  stats: { display: 'flex', gap: 8 },
  survivorRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  survivorChip: {
    padding: '2px 6px',
    borderRadius: 4,
    color: '#fff',
    fontSize: '0.75rem',
  },
  actions: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 },
  survivorActions: { display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' },
  survivorActionsLabel: {
    color: '#aaa',
    fontSize: '0.8rem',
    marginRight: 2,
    minWidth: 40,
  },
  actionBtn: {
    padding: '3px 8px',
    background: '#0f3460',
    color: '#90caf9',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.78rem',
  },
};
