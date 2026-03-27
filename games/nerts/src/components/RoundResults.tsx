interface PlayerResult {
  playerId: string;
  name: string;
  foundationCards: number;
  nertsPenalty: number;
  roundScore: number;
  cumulativeScore: number;
}

interface RoundResultsProps {
  results: PlayerResult[];
  nertsCallerId: string | null;
  playerNames: Record<string, string>;
  isHost: boolean;
  gameOver: boolean;
  gameWinnerId: string | null;
  onNextRound: () => void;
  onPlayAgain: () => void;
  onGoHome?: () => void;
}

export function RoundResults({
  results,
  nertsCallerId,
  isHost,
  gameOver,
  gameWinnerId,
  playerNames,
  onNextRound,
  onPlayAgain,
  onGoHome,
}: RoundResultsProps) {
  const nertsCallerName = nertsCallerId ? (playerNames[nertsCallerId] ?? nertsCallerId) : null;
  const gameWinnerName = gameWinnerId ? (playerNames[gameWinnerId] ?? gameWinnerId) : null;

  if (gameOver) {
    return (
      <div className="game-over-overlay">
        <div className="game-over-panel">
          <div className="game-over-title">GAME OVER</div>
          <div className="game-over-winner">{gameWinnerName} wins!</div>
          <table className="round-results-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Total Score</th>
              </tr>
            </thead>
            <tbody>
              {results
                .slice()
                .sort((a, b) => b.cumulativeScore - a.cumulativeScore)
                .map(r => (
                  <tr key={r.playerId} className={r.playerId === gameWinnerId ? 'winner-row' : ''}>
                    <td>{r.name}</td>
                    <td>{r.cumulativeScore}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {isHost && (
            <button className="primary" style={{ width: '100%', padding: '14px', fontSize: 16, marginTop: 16 }} onClick={onPlayAgain}>
              Play Again
            </button>
          )}
          {!isHost && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
              Waiting for host...
            </div>
          )}
          <button style={{ width: '100%', padding: '10px', fontSize: 14, marginTop: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: 6, cursor: 'pointer' }} onClick={onGoHome}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="round-results-overlay">
      <div className="round-results-panel">
        <h2>Round Complete!</h2>
        {nertsCallerName && (
          <div style={{ textAlign: 'center', color: '#ffe03a', fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
            {nertsCallerName} called Nerts!
          </div>
        )}
        <table className="round-results-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Foundation</th>
              <th>Nerts Penalty</th>
              <th>Round</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {results
              .slice()
              .sort((a, b) => b.roundScore - a.roundScore)
              .map(r => (
                <tr key={r.playerId} className={r.playerId === nertsCallerId ? 'winner-row' : ''}>
                  <td>{r.name}</td>
                  <td>+{r.foundationCards}</td>
                  <td>{r.nertsPenalty > 0 ? `-${r.nertsPenalty * 2}` : '0'}</td>
                  <td style={{ fontWeight: 700 }}>{r.roundScore > 0 ? `+${r.roundScore}` : r.roundScore}</td>
                  <td style={{ fontWeight: 700 }}>{r.cumulativeScore}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {isHost && (
          <button
            className="primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, marginTop: 8 }}
            onClick={onNextRound}
          >
            Next Round
          </button>
        )}
        {!isHost && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
            Waiting for host to start next round...
          </div>
        )}
      </div>
    </div>
  );
}
