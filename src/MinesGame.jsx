import React, { useState, useCallback } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './mines.css';

const GRID_SIZE = 25;

function calcMultiplier(minesCount, gemsRevealed) {
  if (gemsRevealed === 0) return 1.0;
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;
  let probability = 1;
  for (let i = 0; i < gemsRevealed; i++) {
    probability *= (safeTiles - i) / (totalTiles - i);
  }
  const raw = (0.99 / probability);
  return Math.round(raw * 100) / 100;
}

export default function MinesGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [minesCount, setMinesCount] = useState(3);
  const [gameState, setGameState] = useState('idle'); // idle | playing | won | lost
  const [minePositions, setMinePositions] = useState(new Set());
  const [revealedTiles, setRevealedTiles] = useState(new Set());
  const [gemsFound, setGemsFound] = useState(0);
  const [message, setMessage] = useState('');
  const [lastClickedMine, setLastClickedMine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPayout, setLastPayout] = useState(null);

  const safeTiles = GRID_SIZE - minesCount;
  const currentMultiplier = calcMultiplier(minesCount, gemsFound);
  const totalProfit = betAmount
    ? (parseFloat(betAmount) * currentMultiplier - parseFloat(betAmount)).toFixed(2)
    : '0';
  const totalPayout = betAmount
    ? (parseFloat(betAmount) * currentMultiplier).toFixed(2)
    : '0';

  const handleBet = async () => {
    const amount = parseFloat(betAmount);
    if (!amount || amount < 0) { setError('Please enter a bet amount.'); return; }
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/games/mines/start', { amount, minesCount });
      if (res.data.success) {
        setRevealedTiles(new Set());
        setMinePositions(new Set());
        setGemsFound(0);
        setGameState('playing');
        setLastClickedMine(null);
        setLastPayout(null);
        fetchBalance();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTileClick = async (index) => {
    if (gameState !== 'playing') return;
    if (revealedTiles.has(index)) return;
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/games/mines/reveal', { tileIndex: index });
      const data = res.data.data;

      const newRevealed = new Set(revealedTiles);
      newRevealed.add(index);
      setRevealedTiles(newRevealed);

      if (data.isMine || data.bust) {
        // Server confirmed it's a mine
        setMinePositions(new Set(data.minePositions || [index]));
        setLastClickedMine(index);
        setGameState('lost');
        setMessage('💥 You hit a mine! Better luck next time.');
        setLastPayout({ won: false, amount: betAmount });
        fetchBalance();
      } else if (data.won && data.autoWin) {
        // All safe tiles revealed — auto cashout
        setGemsFound(prev => prev + 1);
        setMinePositions(new Set(data.minePositions || []));
        setGameState('won');
        setMessage(`🏆 Amazing! You found all gems!`);
        setLastPayout({ won: true, amount: data.payout, multiplier: data.multiplier });
        fetchBalance();
      } else {
        // Safe tile revealed
        setGemsFound(prev => prev + 1);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to reveal tile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashout = async () => {
    if (gameState !== 'playing' || gemsFound === 0) return;
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/games/mines/cashout', {});
      const data = res.data.data;

      setMinePositions(new Set(data.minePositions || []));
      setGameState('won');
      setMessage(`✅ Cashed out! You won ${data.payout.toFixed(4)} (${data.multiplier}×)`);
      setLastPayout({ won: true, amount: data.payout, multiplier: data.multiplier });
      fetchBalance();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Cashout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomPick = () => {
    if (gameState !== 'playing' || isLoading) return;
    const unrevealed = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!revealedTiles.has(i)) unrevealed.push(i);
    }
    if (unrevealed.length === 0) return;
    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    handleTileClick(randomIndex);
  };

  const handleReset = () => {
    setGameState('idle');
    setRevealedTiles(new Set());
    setMinePositions(new Set());
    setGemsFound(0);
    setMessage('');
    setLastClickedMine(null);
    setError('');
    setLastPayout(null);
  };

  const halfBet = () => { if (betAmount) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount) setBetAmount((Number(betAmount) * 2).toString()); };

  const getTileState = (index) => {
    if (!revealedTiles.has(index)) return 'hidden';
    if (minePositions.has(index)) {
      if (index === lastClickedMine) return 'mine-clicked';
      return 'mine';
    }
    return 'gem';
  };

  return (
    <div className="mines-page">
      {/* Left Panel */}
      <div className="mines-panel">
        {/* Mode Toggle */}
        <div className="mines-mode-tabs">
          {['Manual', 'Auto'].map(m => (
            <button
              key={m}
              className={`mines-mode-tab ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Bet Amount */}
        <div className="mines-field">
          <div className="mines-field-label">
            <span>Bet Amount</span>
            <span className="mines-field-value">$0.00</span>
          </div>
          <div className="mines-input-row">
            <div className="mines-input-wrapper">
              <span className="mines-currency-icon">Ł</span>
              <input
                type="number"
                className="mines-input"
                placeholder="0"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || gameState === 'playing'}
                min="0"
                step="1"
              />
            </div>
            <button className="mines-half-btn" onClick={halfBet} disabled={gameState === 'playing'}>½</button>
            <button className="mines-double-btn" onClick={doubleBet} disabled={gameState === 'playing'}>2×</button>
          </div>
        </div>

        {/* Mines Selector */}
        <div className="mines-field">
          <label className="mines-field-label">Mines</label>
          <div className="mines-select-wrapper">
            <select
              className="mines-select"
              value={minesCount}
              onChange={e => setMinesCount(Number(e.target.value))}
              disabled={gameState === 'playing'}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gems Counter */}
        <div className="mines-field">
          <label className="mines-field-label">Gems</label>
          <input
            type="text"
            className="mines-input-readonly"
            value={gameState === 'playing' ? safeTiles - gemsFound : safeTiles}
            readOnly
          />
        </div>

        {/* Action Buttons */}
        {gameState === 'idle' || gameState === 'won' || gameState === 'lost' ? (
          <button
            className="mines-bet-btn"
            onClick={gameState === 'idle' ? handleBet : handleReset}
            disabled={isLoading}
          >
            {isLoading ? 'Starting...' : gameState === 'idle' ? 'Bet' : 'New Game'}
          </button>
        ) : (
          <>
            <button
              className={`mines-cashout-btn ${gemsFound === 0 ? 'disabled' : ''}`}
              onClick={handleCashout}
              disabled={gemsFound === 0 || isLoading}
            >
              {isLoading ? '...' : `Cashout (${currentMultiplier.toFixed(2)}×)`}
            </button>
            <button className="mines-random-btn" onClick={handleRandomPick} disabled={isLoading}>
              Random Pick
            </button>
          </>
        )}

        {/* Total Profit */}
        <div className="mines-profit-section">
          <div className="mines-profit-label">
            <span>Total Profit ({currentMultiplier.toFixed(2)}×)</span>
            <span className="mines-profit-usd">$0.00</span>
          </div>
          <div className="mines-input-wrapper">
            <span className="mines-currency-icon">Ł</span>
            <input
              type="text"
              className="mines-input"
              value={gameState === 'playing' && gemsFound > 0 ? totalProfit : '0'}
              readOnly
            />
          </div>
        </div>

        {/* Error */}
        {error && <div className="mines-message error">{error}</div>}
        {/* Message */}
        {message && !error && (
          <div className={`mines-message ${gameState === 'lost' ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="mines-grid-area">
        <div className="mines-grid">
          {Array.from({ length: GRID_SIZE }, (_, i) => {
            const state = getTileState(i);
            return (
              <button
                key={i}
                className={`mines-tile ${state}`}
                onClick={() => handleTileClick(i)}
                disabled={gameState !== 'playing' || revealedTiles.has(i) || isLoading}
              >
                {state === 'gem' && (
                  <svg viewBox="0 0 60 60" className="mines-gem-icon">
                    <polygon points="30,5 55,20 55,40 30,55 5,40 5,20" fill="#00e701" opacity="0.9"/>
                    <polygon points="30,5 55,20 30,30" fill="#00ff00" opacity="0.7"/>
                    <polygon points="5,20 30,30 30,55" fill="#009900" opacity="0.8"/>
                    <polygon points="55,20 30,30 55,40" fill="#007700" opacity="0.8"/>
                    <polygon points="30,30 5,40 30,55" fill="#00bb00" opacity="0.7"/>
                    <polygon points="5,20 30,5 30,30" fill="#44ff44" opacity="0.6"/>
                  </svg>
                )}
                {(state === 'mine' || state === 'mine-clicked') && (
                  <svg viewBox="0 0 60 60" className="mines-mine-icon">
                    <circle cx="30" cy="30" r="14" fill={state === 'mine-clicked' ? '#ff2222' : '#ff6644'}/>
                    <line x1="30" y1="10" x2="30" y2="5" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="30" y1="50" x2="30" y2="55" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="10" y1="30" x2="5" y2="30" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="50" y1="30" x2="55" y2="30" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="16" y1="16" x2="12" y2="12" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="44" y1="16" x2="48" y2="12" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="16" y1="44" x2="12" y2="48" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="44" y1="44" x2="48" y2="48" stroke="#ff8866" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="25" cy="25" r="4" fill="white" opacity="0.5"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Win overlay */}
        {gameState === 'won' && lastPayout && (
          <div className="mines-result-overlay won">
            <div className="mines-result-box">
              <div className="mines-result-emoji">💎</div>
              <div className="mines-result-title">You Win!</div>
              <div className="mines-result-amount">{parseFloat(lastPayout.amount).toFixed(4)} Ł</div>
              <div className="mines-result-mult">{lastPayout.multiplier?.toFixed(2)}×</div>
            </div>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="mines-result-overlay lost">
            <div className="mines-result-box">
              <div className="mines-result-emoji">💥</div>
              <div className="mines-result-title">Mine Hit!</div>
              <div className="mines-result-amount">-{betAmount || '0'} Ł</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
