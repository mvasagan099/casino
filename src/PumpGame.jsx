import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './pump.css';

const DIFFICULTIES = {
  Easy: { increment: 1.10, surviveChance: 0.89 },
  Medium: { increment: 1.25, surviveChance: 0.784 },
  Hard: { increment: 1.50, surviveChance: 0.653 },
  Expert: { increment: 2.00, surviveChance: 0.49 }
};

export default function PumpGame() {
  const { fetchBalance, balance } = useWallet();
  const [betAmount, setBetAmount] = useState('0');
  const [difficulty, setDifficulty] = useState('Medium');
  const [status, setStatus] = useState('idle'); // idle, playing, burst, cashed_out
  const [currentMult, setCurrentMult] = useState(1.00);
  const [pumpCount, setPumpCount] = useState(0);
  const [isPumping, setIsPumping] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Auto mode
  const [mode, setMode] = useState('Manual');
  const [autoBetsCount, setAutoBetsCount] = useState('0');
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);
  const [targetPumps, setTargetPumps] = useState('5'); // Auto mode stops after this many pumps

  const halfBet = () => { if (betAmount && status !== 'playing' && !isAutoActive) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'playing' && !isAutoActive) setBetAmount((Number(betAmount) * 2).toString()); };

  const startRound = async () => {
    if (parseFloat(betAmount) < 0) return;
    try {
      await api.post('/games/pump/start', { amount: parseFloat(betAmount) || 0, difficulty });
      setStatus('playing');
      setCurrentMult(1.00);
      setPumpCount(0);
      setIsPumping(false);
      fetchBalance();
    } catch (err) {
      console.error('Pump start failed:', err);
    }
  };

  const executePump = async () => {
    if (status !== 'playing' || isPumping) return;
    setIsPumping(true);
    try {
      const res = await api.post('/games/pump/pump', {});
      const { survived, burst, pumpCount: newCount, currentMult: newMult } = res.data.data;
      setTimeout(() => {
        if (burst) {
          setStatus('burst');
          setIsPumping(false);
          setHistory(prev => [{ mult: 0, profit: -parseFloat(betAmount), win: false }, ...prev].slice(0, 10));
          fetchBalance();
        } else {
          setPumpCount(newCount);
          setCurrentMult(newMult);
          setIsPumping(false);
        }
      }, 400);
    } catch (err) {
      console.error('Pump pump failed:', err);
      setIsPumping(false);
    }
  };

  const handleCashout = async () => {
    if (status !== 'playing' || isPumping || pumpCount === 0) return;
    try {
      const res = await api.post('/games/pump/cashout', {});
      const { payout, multiplier } = res.data.data;
      setStatus('cashed_out');
      const profit = payout - parseFloat(betAmount);
      setHistory(prev => [{ mult: multiplier, profit, win: true }, ...prev].slice(0, 10));
      fetchBalance();
    } catch (err) {
      console.error('Pump cashout failed:', err);
    }
  };

  const toggleAuto = () => {
    if (isAutoActive) {
      setIsAutoActive(false);
    } else {
      if (parseFloat(betAmount) < 0) return;
      const count = parseInt(autoBetsCount) || 0;
      setAutoBetsRemaining(count > 0 ? count - 1 : -1);
      setIsAutoActive(true);
      startRound();
    }
  };

  // Auto bet orchestration
  useEffect(() => {
    if (!isAutoActive) return;

    if (status === 'idle' || status === 'burst' || status === 'cashed_out') {
      if (status !== 'idle') {
        // Delay before starting next round
        const nextRoundTimer = setTimeout(() => {
          if (!isAutoActive) return;
          if (autoBetsRemaining > 0) {
            setAutoBetsRemaining(prev => prev - 1);
            startRound();
          } else if (autoBetsRemaining === -1) {
            startRound();
          } else {
            setIsAutoActive(false);
          }
        }, 1000);
        return () => clearTimeout(nextRoundTimer);
      }
    } else if (status === 'playing' && !isPumping) {
      // Decide whether to pump or cashout
      const target = parseInt(targetPumps) || 1;
      const timer = setTimeout(() => {
        if (!isAutoActive) return;
        if (pumpCount < target) {
          executePump();
        } else {
          handleCashout();
        }
      }, 500); // Wait a bit between pumps
      return () => clearTimeout(timer);
    }
  }, [status, isPumping, isAutoActive, autoBetsRemaining, pumpCount, targetPumps]);

  const balloonScale = 1 + (pumpCount * 0.15);
  const profitOnWin = (parseFloat(betAmount) * currentMult).toFixed(2);

  const upcomingSteps = Array.from({ length: Math.max(10, pumpCount + 6) }, (_, i) => {
    let mult = 1.00;
    for (let j = 0; j < i; j++) mult *= DIFFICULTIES[difficulty].increment;
    return mult;
  });

  return (
    <div className="pump-page">
      <div className="pump-panel">
        <div className="pump-mode-tabs">
          <button className={`pump-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`pump-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="pump-field">
          <div className="pump-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="pump-input-row">
            <div className="pump-input-wrap">
              <span className="pump-cur">Ł</span>
              <input
                type="number" className="pump-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'playing' || isAutoActive} min="0" step="1"
              />
            </div>
            <button className="pump-sm-btn" onClick={halfBet} disabled={status === 'playing' || isAutoActive}>½</button>
            <button className="pump-sm-btn" onClick={doubleBet} disabled={status === 'playing' || isAutoActive}>2×</button>
          </div>
        </div>

        <div className="pump-field">
          <label className="pump-field-label">Difficulty</label>
          <select 
            className="pump-select" 
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            disabled={status === 'playing' || isAutoActive}
          >
            {Object.keys(DIFFICULTIES).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {mode === 'Auto' && (
          <>
            <div className="pump-field">
              <label className="pump-field-label">Number of Bets</label>
              <div className="pump-input-wrap">
                <input
                  type="number" className="pump-input" placeholder="0"
                  value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                  disabled={isAutoActive} min="0" step="1"
                />
                <span className="pump-cur" style={{fontSize: 18, marginRight: 4, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
              </div>
            </div>
            <div className="pump-field">
              <label className="pump-field-label">Target Pumps</label>
              <div className="pump-input-wrap">
                <input
                  type="number" className="pump-input" placeholder="5"
                  value={targetPumps} onChange={e => setTargetPumps(e.target.value)}
                  disabled={isAutoActive} min="1" step="1"
                />
              </div>
            </div>
          </>
        )}

        {mode === 'Auto' ? (
          <button 
            className="pump-bet-btn" 
            onClick={toggleAuto} 
            disabled={parseFloat(betAmount) < 0}
          >
            {isAutoActive ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        ) : status === 'playing' ? (
          <>
            <button 
              className={`pump-bet-btn cashout ${isPumping || pumpCount === 0 ? 'disabled' : ''}`} 
              onClick={handleCashout} 
              disabled={isPumping || pumpCount === 0}
            >
              Cashout
            </button>
            <button 
              className={`pump-sec-btn ${isPumping ? 'disabled' : ''}`} 
              onClick={executePump} 
              disabled={isPumping}
            >
              Pump
            </button>
          </>
        ) : (
          <button className="pump-bet-btn" onClick={startRound} disabled={parseFloat(betAmount) < 0}>
            Bet
          </button>
        )}

        <div className="pump-field" style={{ marginTop: '12px' }}>
          <div className="pump-field-label">
            <span>Total Profit ({currentMult.toFixed(2)}×)</span>
            <span>$0.00</span>
          </div>
          <div className="pump-input-wrap disabled">
            <input type="text" className="pump-input" value={profitOnWin} readOnly />
            <span className="pump-cur">Ł</span>
          </div>
        </div>
      </div>

      <div className="pump-game-area">
        <div className="pump-board-wrapper">
          <div className="pump-machine">
            {/* Balloon */}
            <div className="pump-balloon-container">
              {status !== 'burst' ? (
                <div 
                  className={`pump-balloon ${isPumping ? 'pumping' : ''}`} 
                  style={{ transform: `scale(${balloonScale})` }}
                >
                  <div className="pump-balloon-shine"></div>
                  <div className="pump-balloon-knot"></div>
                  <div className="pump-balloon-text">
                    {currentMult.toFixed(2)}x
                  </div>
                </div>
              ) : (
                <div className="pump-burst-anim">
                  💥
                </div>
              )}
            </div>

            {/* Pump mechanism visual */}
            <div className="pump-base">
              <div className="pump-hose"></div>
              <div className={`pump-handle ${isPumping ? 'press' : ''}`}></div>
              <div className="pump-body">
                <div className="pump-dots">
                  <span></span><span></span><span></span><span></span>
                </div>
              </div>
            </div>
            
            {/* Multiplier Track */}
            <div className="pump-multiplier-track">
              <div className="pump-track-inner" style={{ transform: `translateX(-${Math.max(0, pumpCount - 1) * 76}px)` }}>
                {upcomingSteps.map((step, idx) => (
                  <div key={idx} className={`pump-track-step ${idx === pumpCount && status !== 'idle' && status !== 'burst' ? 'active' : ''} ${status === 'burst' && idx === pumpCount ? 'burst' : ''}`}>
                    {step.toFixed(2)}×
                  </div>
                ))}
              </div>
            </div>
            
            {/* Result Overlay */}
            {(status === 'cashed_out' || status === 'burst') && (
              <div className={`pump-result-overlay ${status}`}>
                {status === 'burst' ? (
                  <div className="result-text fail">0.00×</div>
                ) : (
                  <div className="result-text win">
                    <div className="mult-text">{currentMult.toFixed(2)}×</div>
                    <div className="profit-text">+{profitOnWin} Ł</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="pump-history">
          {history.map((h, i) => (
            <div key={i} className={`history-item ${h.win ? 'win' : 'loss'}`}>
              {h.mult.toFixed(2)}×
            </div>
          ))}
        </div>

        <div className="pump-bottom-bar">
          <div className="pump-bl">
            <button className="pump-icon-btn">⚙</button>
            <button className="pump-icon-btn">⛶</button>
            <button className="pump-icon-btn">📊</button>
          </div>
          <div className="pump-brand">Kings</div>
          <div className="pump-br">
            <button className="pump-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
