import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './darts.css';

const MULTIPLIERS = [
  { val: 0.4, color: '#55657e' },  // Gray
  { val: 0.6, color: '#2f4553' },  // Dark Gray
  { val: 1.3, color: '#f1c40f' },  // Yellow
  { val: 3.1, color: '#f39c12' },  // Orange
  { val: 6.0, color: '#e74c3c' },  // Red
  { val: 16.0, color: '#00e701' }, // Green
];

// Define visual wheel segments (20 segments for aesthetics)
const VISUAL_SEGMENTS = [
  0.4, 1.3, 0.6, 3.1, 0.4, 1.3, 0.6, 6.0, 0.4, 1.3, 
  0.6, 3.1, 0.4, 1.3, 0.6, 16.0, 0.4, 1.3, 0.6, 0.4
];

const getPayoutColor = (mult) => {
  const m = MULTIPLIERS.find(x => x.val === mult);
  return m ? m.color : '#2f4553';
};

export default function DartsGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [difficulty, setDifficulty] = useState('Medium');
  
  const [status, setStatus] = useState('idle'); // idle, throwing, resolved
  
  // Visual state
  const [dartRotation, setDartRotation] = useState(0); // rotation to hit
  const [boardRotation, setBoardRotation] = useState(0); // constant rotation
  const [showDart, setShowDart] = useState(false);
  const [resultMsg, setResultMsg] = useState(null); // The payout
  
  // Auto mode
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsCount, setAutoBetsCount] = useState('0');
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);

  const halfBet = () => { if (betAmount && status !== 'throwing' && !isAutoActive) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'throwing' && !isAutoActive) setBetAmount((Number(betAmount) * 2).toString()); };

  const pickRngOutcome = (diff) => {
    // Mock probabilities (0 to 100)
    const r = Math.random() * 100;
    
    // Easy: More 1.3x and 3.1x
    // Medium: Balanced
    // Hard: More 0.4x and 0.6x
    let probs = [];
    if (diff === 'Easy') {
      probs = [
        { val: 16.0, p: 2 }, { val: 6.0, p: 5 }, { val: 3.1, p: 15 },
        { val: 1.3, p: 30 }, { val: 0.6, p: 28 }, { val: 0.4, p: 20 }
      ];
    } else if (diff === 'Hard') {
      probs = [
        { val: 16.0, p: 0.5 }, { val: 6.0, p: 1.5 }, { val: 3.1, p: 5 },
        { val: 1.3, p: 13 }, { val: 0.6, p: 40 }, { val: 0.4, p: 40 }
      ];
    } else {
      probs = [
        { val: 16.0, p: 1 }, { val: 6.0, p: 2 }, { val: 3.1, p: 8 },
        { val: 1.3, p: 20 }, { val: 0.6, p: 35 }, { val: 0.4, p: 34 }
      ];
    }
    
    let cum = 0;
    for (let prob of probs) {
      cum += prob.p;
      if (r <= cum) return prob.val;
    }
    return 0.4;
  };

  const startRound = async () => {
    if (parseFloat(betAmount) < 0) return;
    setStatus('throwing');
    setResultMsg(null);
    setShowDart(false);
    
    try {
      const res = await api.post('/games/darts/bet', { amount: parseFloat(betAmount) || 0, difficulty });
      const { multiplier: finalMult } = res.data.data;
      
      // Find matching segments on visual board for animation
      const matchingIndices = [];
      VISUAL_SEGMENTS.forEach((seg, i) => { if (seg === finalMult) matchingIndices.push(i); });
      const targetIdx = matchingIndices.length > 0
        ? matchingIndices[Math.floor(Math.random() * matchingIndices.length)]
        : Math.floor(Math.random() * VISUAL_SEGMENTS.length);
      
      const segAngle = 360 / VISUAL_SEGMENTS.length;
      const targetAngle = (targetIdx * segAngle) + (segAngle / 2);
      
      setTimeout(() => {
        setDartRotation(targetAngle);
        setShowDart(true);
        setTimeout(() => {
          const bet = parseFloat(betAmount);
          const winAmount = bet * finalMult;
          const profit = winAmount - bet;
          setResultMsg({ mult: finalMult, winAmount, profit });
          setStatus('resolved');
          fetchBalance();
        }, 500);
      }, 100);
    } catch (err) {
      console.error('Darts bet failed:', err);
      setStatus('idle');
      if (isAutoActive) setIsAutoActive(false);
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

  useEffect(() => {
    if (!isAutoActive || status !== 'resolved') return;
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
  }, [status, isAutoActive, autoBetsRemaining]);

  // Generate conic gradient for the visual board
  const conicStops = VISUAL_SEGMENTS.map((mult, idx) => {
    const color = getPayoutColor(mult);
    const startPct = (idx / 20) * 100;
    const endPct = ((idx + 1) / 20) * 100;
    return `${color} ${startPct}% ${endPct}%`;
  }).join(', ');

  return (
    <div className="dart-page">
      <div className="dart-panel">
        <div className="dart-mode-tabs">
          <button className={`dart-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`dart-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="dart-field">
          <div className="dart-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="dart-input-row">
            <div className="dart-input-wrap">
              <span className="dart-cur">Ł</span>
              <input
                type="number" className="dart-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'throwing' || isAutoActive} min="0" step="1"
              />
            </div>
            <button className="dart-sm-btn" onClick={halfBet} disabled={status === 'throwing' || isAutoActive}>½</button>
            <button className="dart-sm-btn" onClick={doubleBet} disabled={status === 'throwing' || isAutoActive}>2×</button>
          </div>
        </div>
        
        <div className="dart-field">
          <label className="dart-field-label">Difficulty</label>
          <div className="dart-input-wrap">
            <select 
              className="dart-select" 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={status === 'throwing' || isAutoActive}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {mode === 'Auto' && (
          <div className="dart-field">
            <label className="dart-field-label">Number of Bets</label>
            <div className="dart-input-wrap">
              <input
                type="number" className="dart-input" placeholder="0"
                value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                disabled={isAutoActive} min="0" step="1"
              />
              <span className="dart-cur" style={{fontSize: 18, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
            </div>
          </div>
        )}

        {mode === 'Auto' ? (
          <button 
            className="dart-bet-btn" 
            onClick={toggleAuto} 
            disabled={parseFloat(betAmount) < 0}
          >
            {isAutoActive ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        ) : (
          <button className="dart-bet-btn" onClick={startRound} disabled={status === 'throwing' || parseFloat(betAmount) < 0}>
            Bet
          </button>
        )}
      </div>

      <div className="dart-game-area">
        
        <div className="dart-board-wrapper">
          <div className="dart-machine">
            {/* The Dartboard */}
            <div className="dart-board-container">
              <div className="dart-board" style={{ background: `conic-gradient(${conicStops})` }}>
                <div className="dart-inner-ring">
                  <div className="dart-bullseye"></div>
                </div>
                {/* Dart Wrapper that spins with the board */}
                <div className="dart-projectile-wrapper" style={{ transform: `rotate(${dartRotation}deg)` }}>
                   <div className={`dart-projectile ${showDart ? 'stuck' : ''}`}>
                     <div className="dart-tail"></div>
                     <div className="dart-body"></div>
                     <div className="dart-tip"></div>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Result Overlay */}
            {status === 'resolved' && resultMsg && (
              <div className="dart-result-float" style={{ color: getPayoutColor(resultMsg.mult) }}>
                {resultMsg.mult}×
              </div>
            )}
          </div>
        </div>
        
        {/* Multipliers Legend */}
        <div className="dart-legend">
          {MULTIPLIERS.map(m => (
            <div key={m.val} className="dart-legend-pill" style={{ borderColor: m.color }}>
              <div className="dart-legend-color" style={{ backgroundColor: m.color }}></div>
              <span>{m.val}×</span>
            </div>
          ))}
        </div>

        <div className="dart-bottom-bar">
          <div className="dart-bl">
            <button className="dart-icon-btn">⚙</button>
            <button className="dart-icon-btn">⛶</button>
            <button className="dart-icon-btn">📊</button>
          </div>
          <div className="dart-brand">Kings</div>
          <div className="dart-br">
            <button className="dart-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
