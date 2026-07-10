import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './drill.css';

const DRILLS = [
  { id: 'blue', color: '#0070FF', icon: '♦' },
  { id: 'yellow', color: '#ffb800', icon: '●' },
  { id: 'green', color: '#00e701', icon: '▲' }
];

export default function DrillGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [targetMult, setTargetMult] = useState('2.00');
  const [selectedDrill, setSelectedDrill] = useState('green');
  
  const [status, setStatus] = useState('idle'); // idle, drilling, resolved
  const [resultMsg, setResultMsg] = useState(null);
  
  // Drill states
  const [multipliers, setMultipliers] = useState([0, 0, 0]);
  const [crashed, setCrashed] = useState([false, false, false]);
  
  // Auto mode
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsCount, setAutoBetsCount] = useState('0');
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);

  const animRef = useRef(null);

  const winChance = targetMult && parseFloat(targetMult) >= 1.01 ? Math.min(100, 98 / parseFloat(targetMult)) : 0;
  const profitOnWin = (parseFloat(betAmount || 0) * parseFloat(targetMult || 1)) - parseFloat(betAmount || 0);

  const halfBet = () => { if (betAmount && status !== 'drilling' && !isAutoActive) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'drilling' && !isAutoActive) setBetAmount((Number(betAmount) * 2).toString()); };

  const handleTargetChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 1.01) val = 1.01;
    setTargetMult(val.toFixed(2));
  };

  const startRound = async () => {
    const amount = parseFloat(betAmount);
    if (amount < 0 || parseFloat(targetMult) < 1.01) {
      if (isAutoActive) setIsAutoActive(false);
      return;
    }
    
    setStatus('drilling');
    setResultMsg(null);
    setMultipliers([0, 0, 0]);
    setCrashed([false, false, false]);
    
    try {
      const res = await api.post('/games/drill/bet', {
        amount,
        target: parseFloat(targetMult),
        pick: DRILLS.findIndex(d => d.id === selectedDrill)
      });

      if (res.data.success) {
        const { crashPoints, pick, multiplier: payoutMult, won, payout, profit } = res.data.data;
        
        const maxVisual = Math.max(parseFloat(targetMult) + 1, Math.min(...crashPoints) + 2);
        const duration = 2000;
        const startTime = performance.now();

        const updateAnim = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);
          
          const currentVisualMult = maxVisual * Math.pow(progress, 2);
          
          const newMults = [...multipliers];
          const newCrashed = [...crashed];
          let allDone = true;

          for (let i = 0; i < 3; i++) {
            if (currentVisualMult >= crashPoints[i]) {
              newMults[i] = crashPoints[i];
              newCrashed[i] = true;
            } else {
              newMults[i] = currentVisualMult;
              allDone = false;
            }
          }

          setMultipliers(newMults);
          setCrashed(newCrashed);

          if (allDone || progress >= 1) {
            setMultipliers(crashPoints);
            setCrashed([true, true, true]);
            
            setResultMsg({ win: won, mult: payoutMult, profit });
            setStatus('resolved');
            fetchBalance();
          } else {
            animRef.current = requestAnimationFrame(updateAnim);
          }
        };

        animRef.current = requestAnimationFrame(updateAnim);
      }
    } catch (err) {
      console.error('Drill bet failed:', err);
      setStatus('idle');
      if (isAutoActive) setIsAutoActive(false);
    }
  };

  const toggleAuto = () => {
    if (isAutoActive) {
      setIsAutoActive(false);
    } else {
      if (parseFloat(betAmount) < 0 || parseFloat(targetMult) < 1.01) return;
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

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="drill-page">
      <div className="drill-panel">
        <div className="drill-mode-tabs">
          <button className={`drill-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`drill-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="drill-field">
          <div className="drill-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="drill-input-row">
            <div className="drill-input-wrap">
              <span className="drill-cur">Ł</span>
              <input
                type="number" className="drill-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'drilling' || isAutoActive} min="0" step="1"
              />
            </div>
            <button className="drill-sm-btn" onClick={halfBet} disabled={status === 'drilling' || isAutoActive}>½</button>
            <button className="drill-sm-btn" onClick={doubleBet} disabled={status === 'drilling' || isAutoActive}>2×</button>
          </div>
        </div>
        
        <div className="drill-field">
          <label className="drill-field-label">Target Multiplier</label>
          <div className="drill-input-wrap">
            <input type="number" className="drill-input" value={targetMult} onChange={handleTargetChange} disabled={status === 'drilling' || isAutoActive} step="0.01"/>
            <span className="drill-cur">×</span>
          </div>
        </div>
        
        <div className="drill-field">
          <label className="drill-field-label">Win Chance</label>
          <div className="drill-input-wrap disabled">
            <input type="text" className="drill-input" value={winChance.toFixed(2)} readOnly />
            <span className="drill-cur">%</span>
          </div>
        </div>
        
        <div className="drill-field">
          <div className="drill-select-row">
            {DRILLS.map(d => (
              <button 
                key={d.id}
                className={`drill-select-btn ${selectedDrill === d.id ? 'active' : ''}`}
                style={{ '--drill-color': d.color }}
                onClick={() => !isAutoActive && status !== 'drilling' && setSelectedDrill(d.id)}
                disabled={status === 'drilling' || isAutoActive}
              >
                {d.id === 'blue' && <span className="d-icon d-blue">♦</span>}
                {d.id === 'yellow' && <span className="d-icon d-yellow">●</span>}
                {d.id === 'green' && <span className="d-icon d-green">▲</span>}
              </button>
            ))}
          </div>
        </div>

        {mode === 'Auto' && (
          <div className="drill-field" style={{ marginTop: '12px' }}>
            <label className="drill-field-label">Number of Bets</label>
            <div className="drill-input-wrap">
              <input
                type="number" className="drill-input" placeholder="0"
                value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                disabled={isAutoActive} min="0" step="1"
              />
              <span className="drill-cur" style={{fontSize: 18, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
            </div>
          </div>
        )}

        <button 
          className="drill-bet-btn" 
          style={{ marginTop: '12px' }}
          onClick={mode === 'Auto' ? toggleAuto : startRound} 
          disabled={(mode === 'Manual' && status === 'drilling') || parseFloat(betAmount) < 0}
        >
          {mode === 'Auto' ? (isAutoActive ? 'Stop Autobet' : 'Start Autobet') : 'Bet'}
        </button>
        
        <div className="drill-field" style={{ marginTop: '12px' }}>
          <div className="drill-field-label"><span>Profit on Win</span><span>$0.00</span></div>
          <div className="drill-input-wrap disabled">
            <input type="text" className="drill-input" value={profitOnWin > 0 ? profitOnWin.toFixed(2) : '0'} readOnly />
            <span className="drill-cur">Ł</span>
          </div>
        </div>
        
      </div>

      <div className="drill-game-area">
        <div className="drill-board">
          {DRILLS.map((d, i) => {
            const isSelected = selectedDrill === d.id;
            const mult = multipliers[i];
            const isCrashed = crashed[i];
            
            // Calculate downward movement based on multiplier. 1.00x = 0px.
            const yOffset = mult > 1 ? (mult - 1) * 100 : 0;
            const bustColor = isSelected && isCrashed && mult < parseFloat(targetMult) ? '#e74c3c' : d.color;
            
            return (
              <div key={d.id} className={`drill-lane-track ${isSelected ? 'selected' : ''}`}>
                <div className={`drill-pill ${isSelected ? 'active' : ''} ${isCrashed && !isSelected ? 'crashed' : ''}`} 
                     style={{ backgroundColor: isSelected ? (isCrashed && mult < parseFloat(targetMult) ? '#e74c3c' : d.color) : '' }}>
                  {mult.toFixed(2)}×
                </div>
                
                <div className="drill-lane-area">
                  <div 
                    className={`drill-machine ${!isCrashed && status === 'drilling' ? 'drilling' : ''} ${isCrashed ? 'crashed' : ''}`}
                    style={{ transform: `translateY(${yOffset}px)` }}
                  >
                    <div className="drill-top"></div>
                    <div className="drill-body">
                      <div className="drill-symbol" style={{ color: d.color }}>{d.icon}</div>
                    </div>
                    <div className="drill-bit-wrapper">
                       <div className="drill-bit"></div>
                       <div className="drill-bit-lines"></div>
                    </div>
                    {/* Dirt particles effect */}
                    {!isCrashed && status === 'drilling' && (
                       <div className="drill-dirt"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Result Overlay */}
        {status === 'resolved' && resultMsg && (
          <div className={`drill-result-overlay ${resultMsg.win ? 'win' : 'lose'}`}>
            {resultMsg.win ? `+${resultMsg.profit.toFixed(2)} Ł` : '0.00000000 Ł'}
          </div>
        )}

        <div className="drill-bottom-bar">
          <div className="drill-bl">
            <button className="drill-icon-btn">⚙</button>
            <button className="drill-icon-btn">⛶</button>
            <button className="drill-icon-btn">📊</button>
          </div>
          <div className="drill-brand">Kings</div>
          <div className="drill-br">
            <button className="drill-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
