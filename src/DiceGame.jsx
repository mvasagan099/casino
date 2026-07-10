import React, { useState, useRef, useCallback } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './dice.css';

function calcMultiplier(winChance) {
  if (winChance <= 0 || winChance >= 100) return 0;
  return Math.round((100 / winChance) * 0.99 * 10000) / 10000;
}

export default function DiceGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [target, setTarget] = useState(50.50);
  const [rollMode, setRollMode] = useState('over'); // 'over' | 'under'
  const [rolling, setRolling] = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const [lastWon, setLastWon] = useState(null);
  const [animPos, setAnimPos] = useState(null); // position of roll result dot
  const [error, setError] = useState('');

  const winChance = rollMode === 'over'
    ? Math.round((100 - target) * 10000) / 10000
    : Math.round(target * 10000) / 10000;

  const multiplier = calcMultiplier(winChance);
  const profitOnWin = betAmount && parseFloat(betAmount) > 0
    ? ((parseFloat(betAmount) * multiplier) - parseFloat(betAmount)).toFixed(2)
    : '0';

  const rollValue = rollMode === 'over' ? target : target;
  const rollLabel = rollMode === 'over' ? 'Roll Over' : 'Roll Under';

  const handleRoll = async () => {
    if (parseFloat(betAmount) < 0 || rolling) return;
    setRolling(true);
    setError('');

    try {
      const res = await api.post('/games/dice/bet', {
        amount: parseFloat(betAmount),
        target: parseFloat(target),
        direction: rollMode
      });

      if (res.data.success) {
        const { result, won, payout } = res.data.data;
        
        // Wait a small delay to simulate the roll animation feeling
        setTimeout(() => {
          setRollResult(result);
          setAnimPos(result);
          setLastWon(won);
          setRolling(false);
          fetchBalance(); // Refresh user balance after bet completes
        }, 300);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bet failed');
      setRolling(false);
    }
  };

  const swapMode = () => {
    setRollMode(m => m === 'over' ? 'under' : 'over');
    setRollResult(null);
    setLastWon(null);
    setAnimPos(null);
  };

  const handleSlider = (e) => {
    const val = Math.round(parseFloat(e.target.value) * 100) / 100;
    const clamped = Math.min(Math.max(val, 2), 98);
    setTarget(clamped);
    setRollResult(null);
    setLastWon(null);
    setAnimPos(null);
  };

  const halfBet = () => { if (betAmount) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount) setBetAmount((Number(betAmount) * 2).toString()); };

  // Slider visual: red = lose zone, green = win zone
  const redEnd = rollMode === 'over' ? (target / 100) * 100 : 100;
  const greenStart = rollMode === 'over' ? 0 : 0;
  const redPct = rollMode === 'over' ? target : (100 - target);
  const greenPct = rollMode === 'over' ? (100 - target) : target;

  return (
    <div className="dice-page">
      {/* Left Panel */}
      <div className="dice-panel">
        {/* Mode tabs */}
        <div className="dice-mode-tabs">
          {['Manual', 'Auto'].map(m => (
            <button
              key={m}
              className={`dice-mode-tab ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
          <button className="dice-mode-tab icon-tab" title="Advanced">↺</button>
        </div>

        {/* Bet Amount */}
        <div className="dice-field">
          <div className="dice-field-label">
            <span>Bet Amount</span>
            <span>$0.00</span>
          </div>
          <div className="dice-input-row">
            <div className="dice-input-wrapper">
              <span className="dice-currency">Ł</span>
              <input
                type="number"
                className="dice-input"
                placeholder="0"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || rolling}
                min="0" step="1"
              />
            </div>
            <button className="dice-small-btn" onClick={halfBet} disabled={rolling}>½</button>
            <button className="dice-small-btn" onClick={doubleBet} disabled={rolling}>2×</button>
          </div>
        </div>

        {/* Bet Button */}
        <button
          className={`dice-bet-btn ${rolling ? 'rolling' : ''}`}
          onClick={handleRoll}
          disabled={rolling}
        >
          {rolling ? 'Rolling...' : 'Bet'}
        </button>

        {/* Profit on Win */}
        <div className="dice-field">
          <div className="dice-field-label">
            <span>Profit on Win</span>
            <span>$0.00</span>
          </div>
          <div className="dice-input-wrapper">
            <input
              type="text"
              className="dice-input"
              value={profitOnWin}
              readOnly
            />
            <span className="dice-currency-right">Ł</span>
          </div>
        </div>

        {/* Last Result */}
        {rollResult !== null && (
          <div className={`dice-last-result ${lastWon ? 'won' : 'lost'}`}>
            <span className="dice-result-label">{lastWon ? '✅ WIN' : '❌ LOSE'}</span>
            <span className="dice-result-number">{rollResult.toFixed(2)}</span>
            {lastWon && (
              <span className="dice-result-payout">
                +{(parseFloat(betAmount || 0) * multiplier).toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Game Area */}
      <div className="dice-game-area">
        <div className="dice-game-inner">
          {/* Slider Section */}
          <div className="dice-slider-section">
            {/* Tick marks */}
            <div className="dice-ticks">
              {[0, 25, 50, 75, 100].map(n => (
                <span key={n}>{n}</span>
              ))}
            </div>

            {/* Slider track with color zones */}
            <div className="dice-slider-wrapper">
              {/* Color track */}
              <div className="dice-track">
                {rollMode === 'over' ? (
                  <>
                    <div className="dice-track-red" style={{ width: `${target}%` }} />
                    <div className="dice-track-green" style={{ width: `${100 - target}%` }} />
                  </>
                ) : (
                  <>
                    <div className="dice-track-green" style={{ width: `${target}%` }} />
                    <div className="dice-track-red" style={{ width: `${100 - target}%` }} />
                  </>
                )}
              </div>

              {/* Roll result indicator */}
              {animPos !== null && (
                <div
                  className={`dice-result-dot ${lastWon ? 'won' : 'lost'}`}
                  style={{ left: `${animPos}%` }}
                >
                  <div className="dice-result-dot-label">{rollResult?.toFixed(2)}</div>
                </div>
              )}

              {/* Actual range input */}
              <input
                type="range"
                min="2"
                max="98"
                step="0.01"
                value={target}
                onChange={handleSlider}
                className="dice-range"
              />
              
              {/* Visual Thumb */}
              <div
                className="dice-slider-thumb"
                style={{ left: `${target}%` }}
              >
                <div className="dice-slider-thumb-inner">
                  <div className="dice-slider-thumb-grip"></div>
                  <div className="dice-slider-thumb-grip"></div>
                  <div className="dice-slider-thumb-grip"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="dice-stats-row">
            <div className="dice-stat-box">
              <label className="dice-stat-label">Multiplier</label>
              <div className="dice-stat-input-wrap">
                <input
                  type="number"
                  className="dice-stat-input"
                  value={multiplier.toFixed(4)}
                  onChange={e => {
                    const m = parseFloat(e.target.value);
                    if (m > 1) {
                      const newWC = Math.round((99 / m) * 10000) / 10000;
                      const newTarget = rollMode === 'over'
                        ? Math.round((100 - newWC) * 100) / 100
                        : Math.round(newWC * 100) / 100;
                      setTarget(Math.min(Math.max(newTarget, 2), 98));
                    }
                  }}
                />
                <button className="dice-clear-btn">×</button>
              </div>
            </div>

            {/* Swap button */}
            <div className="dice-swap-wrapper">
              <button className="dice-swap-btn" onClick={swapMode} title="Swap Roll Mode">
                ⇄
              </button>
              <label className="dice-stat-label">{rollLabel}</label>
              <div className="dice-stat-input-wrap">
                <input
                  type="number"
                  className="dice-stat-input"
                  value={target.toFixed(2)}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setTarget(Math.min(Math.max(v, 2), 98));
                  }}
                />
              </div>
            </div>

            <div className="dice-stat-box">
              <label className="dice-stat-label">Win Chance</label>
              <div className="dice-stat-input-wrap">
                <input
                  type="number"
                  className="dice-stat-input"
                  value={winChance.toFixed(4)}
                  onChange={e => {
                    const wc = Math.min(Math.max(parseFloat(e.target.value), 1), 97);
                    const newTarget = rollMode === 'over'
                      ? Math.round((100 - wc) * 100) / 100
                      : Math.round(wc * 100) / 100;
                    setTarget(Math.min(Math.max(newTarget, 2), 98));
                  }}
                />
                <button className="dice-clear-btn">×</button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="dice-bottom-bar">
          <div className="dice-bottom-left">
            <button className="dice-icon-btn" title="Settings">⚙</button>
            <button className="dice-icon-btn" title="Fullscreen">⛶</button>
            <button className="dice-icon-btn" title="Stats">📊</button>
            <button className="dice-icon-btn" title="Share">↗</button>
          </div>
          <div className="dice-brand">Kings</div>
          <div className="dice-bottom-right">
            <button className="dice-fairness-btn">🛡 Fairness</button>
            <button className="dice-icon-btn">🎧</button>
          </div>
        </div>
      </div>
    </div>
  );
}
