interface OpponentViewProps {
  playerId: string;
  name: string;
  backColor: string;
  nertsPileCount: number;
  workPileCounts: number[];
  roundScore: number;
}

export function OpponentView({ name, backColor, nertsPileCount, workPileCounts, roundScore }: OpponentViewProps) {
  const urgency = nertsPileCount <= 3 ? 'low' : nertsPileCount <= 7 ? 'medium' : 'high';

  return (
    <div className="opponent-view">
      <div className="opponent-name-row">
        <div className="opponent-color-swatch" style={{ background: backColor }} />
        <span>{name}</span>
      </div>
      <div className={`opponent-nerts-count ${urgency}`}>{nertsPileCount}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: -4 }}>Nerts pile</div>
      <div className="opponent-work-piles">
        {workPileCounts.map((count, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 24,
              background: backColor,
              borderRadius: 2,
              opacity: count > 0 ? 1 : 0.3,
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 700,
            }}
          >
            {count > 0 ? count : ''}
          </div>
        ))}
      </div>
      <div className="opponent-round-score">+{roundScore} pts this round</div>
    </div>
  );
}
