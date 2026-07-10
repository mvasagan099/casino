import React, { useState, useRef, useEffect } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './limbo.css';

export default function LimboGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [targetMultiplier, setTargetMultiplier] = useState('2.00');
  const [betting, setBetting] = useState(false);
  const [displayMult, setDisplayMult] = useState(1.00);
  const [resultWon, setResultWon] = useState(null); // null | true | false
  const [history, setHistory] = useState([]); // [{mult, won}]
  const [error, setError] = useState('');
  const animRef = useRef(null);

  const target = parseFloat(targetMultiplier) || 1.01;
  const winChance = Math.min(Math.max((99 / target), 0.0001), 99).toFixed(2);
  const profitOnWin = betAmount && parseFloat(betAmount) > 0
    ? ((parseFloat(betAmount) * target) - parseFloat(betAmount)).toFixed(2)
    : '0';

  const handleBet = async () => {
    if (parseFloat(betAmount) < 0 || betting) return;
    if (target < 1.01) return;

    setBetting(true);
    setResultWon(null);
    setError('');

    try {
      const res = await api.post('/games/limbo/bet', {
        amount: parseFloat(betAmount),
        target: parseFloat(target),
      });

      if (res.data.success) {
        const { result, won, payout } = res.data.data;

        // Animate count-up quickly then snap to result
        const start = 1.00;
        const duration = 600; // ms
        const startTime = performance.now();

        const animate = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out
          const eased = 1 - Math.pow(1 - progress, 3);
          const currentDisplay = start + eased * (Math.max(result, target) - start);
          setDisplayMult(Math.round(currentDisplay * 100) / 100);

          if (progress < 1) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            setDisplayMult(Math.round(result * 100) / 100);
            setResultWon(won);
            setBetting(false);
            setHistory(prev => [{ mult: result, won }, ...prev].slice(0, 10));
            fetchBalance(); // refresh balance after result
          }
        };

        animRef.current = requestAnimationFrame(animate);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bet failed');
      setBetting(false);
    }
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const halfBet = () => { if (betAmount) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount) setBetAmount((Number(betAmount) * 2).toString()); };

  const multColor = resultWon === null ? 'white' : resultWon ? '#00e701' : '#ff5555';

  return (
    <div className="limbo-page">
      {/* Left Panel */}
      <div className="limbo-panel">
        <div className="limbo-mode-tabs">
          {['Manual', 'Auto'].map(m => (
            <button key={m} className={`limbo-mode-tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>

        <div className="limbo-field">
          <div className="limbo-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="limbo-input-row">
            <div className="limbo-input-wrap">
              <span className="limbo-cur">Ł</span>
              <input
                type="number" className="limbo-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || betting} min="0" step="1"
              />
            </div>
            <button className="limbo-sm-btn" onClick={halfBet} disabled={betting}>½</button>
            <button className="limbo-sm-btn" onClick={doubleBet} disabled={betting}>2×</button>
          </div>
        </div>

        <button className={`limbo-bet-btn ${betting ? 'rolling' : ''}`} onClick={handleBet} disabled={betting}>
          {betting ? 'Rolling...' : 'Bet'}
        </button>

        <div className="limbo-field">
          <div className="limbo-field-label"><span>Profit on Win</span><span>$0.00</span></div>
          <div className="limbo-input-wrap">
            <input type="text" className="limbo-input" value={profitOnWin} readOnly />
            <span className="limbo-cur-right">Ł</span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="limbo-game-area">
        {/* History badges */}
        <div className="limbo-history">
          {history.map((h, i) => (
            <div key={i} className={`limbo-hist-badge ${h.won ? 'won' : 'lost'}`}>
              {h.mult >= 100 ? h.mult.toFixed(0) : h.mult >= 10 ? h.mult.toFixed(2) : h.mult.toFixed(2)}×
            </div>
          ))}
        </div>

        {/* Main multiplier display */}
        <div className="limbo-display-area">
          <div
            className={`limbo-multiplier ${betting ? 'animating' : ''} ${resultWon === true ? 'won' : resultWon === false ? 'lost' : ''}`}
            style={{ color: multColor }}
          >
            {displayMult >= 100
              ? `${displayMult.toFixed(2)}×`
              : `${displayMult.toFixed(2)}×`
            }
          </div>
          {resultWon !== null && !betting && (
            <div className={`limbo-result-label ${resultWon ? 'won' : 'lost'}`}>
              {resultWon ? `+${(parseFloat(betAmount || 0) * target).toFixed(2)} Ł` : `Lost ${betAmount || '0'} Ł`}
            </div>
          )}
        </div>

        {/* Bottom Stats */}
        <div className="limbo-stats-row">
          <div className="limbo-stat-box">
            <label className="limbo-stat-label">Target Multiplier</label>
            <div className="limbo-stat-input-wrap">
              <input
                type="number"
                className="limbo-stat-input"
                value={targetMultiplier}
                onChange={e => setTargetMultiplier(e.target.value)}
                min="1.01"
                step="0.01"
                disabled={betting}
              />
              <button className="limbo-clear-btn" onClick={() => setTargetMultiplier('2.00')}>×</button>
            </div>
          </div>
          <div className="limbo-stat-box">
            <label className="limbo-stat-label">Win Chance</label>
            <div className="limbo-stat-input-wrap">
              <input
                type="text"
                className="limbo-stat-input"
                value={winChance}
                readOnly
              />
              <button className="limbo-clear-btn" onClick={() => setTargetMultiplier('2.00')}>×</button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="limbo-bottom-bar">
          <div className="limbo-bottom-left">
            <button className="limbo-icon-btn">⚙</button>
            <button className="limbo-icon-btn">⛶</button>
            <button className="limbo-icon-btn">📊</button>
            <button className="limbo-icon-btn">↗</button>
          </div>
          <div className="limbo-brand">Kings</div>
          <div className="limbo-bottom-right">
            <button className="limbo-fairness-btn">🛡 Fairness</button>
            <button className="limbo-icon-btn">🎧</button>
          </div>
        </div>
      </div>
    </div>
  );
}
