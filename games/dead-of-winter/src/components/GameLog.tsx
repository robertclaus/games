import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../game/types';

interface GameLogProps {
  log: LogEntry[];
}

export function GameLog({ log }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div style={styles.container}>
      <div style={styles.label}>Game Log</div>
      <div style={styles.entries}>
        {log.slice(-30).map((entry, i) => (
          <div key={i} style={{ ...styles.entry, color: LOG_COLOR[entry.type] }}>
            <span style={styles.round}>[R{entry.round}]</span>
            {entry.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const LOG_COLOR: Record<LogEntry['type'], string> = {
  info: '#aaa',
  warning: '#ffb74d',
  danger: '#e57373',
  success: '#81c784',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0d1117',
    border: '1px solid #0f3460',
    borderRadius: 6,
  },
  label: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#555',
    padding: '6px 10px 2px',
    borderBottom: '1px solid #0f3460',
  },
  entries: {
    maxHeight: 200,
    overflowY: 'auto',
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  entry: {
    fontSize: '0.78rem',
    lineHeight: 1.4,
  },
  round: {
    color: '#555',
    marginRight: 4,
    fontSize: '0.72rem',
  },
};
