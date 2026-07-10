import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './primedice.css';

export default function PrimeDiceGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  
  // Slider state (0.00 to 100.00)
  const [minVal, setMinVal] = useState(36.00);
  const [maxVal, setMaxVal] = useState(59.00);
  
  // Game state
  const [status, setStatus] = useState('idle');
  const [history, setHistory] = useState([]);
  const [currentRoll, setCurrentRoll] = useState(null);
  
  // Auto mode
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsCount, setAutoBetsCount] = useState('0');
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);

  const sliderRef = useRef(null);
  const isDragging = useRef(null); // 'min' or 'max'

  const winChance = Math.max(0.01, maxVal - minVal);
  const multiplier = 99 / winChance;
  const profitOnWin = (parseFloat(betAmount || 0) * multiplier) - parseFloat(betAmount || 0);

  const halfBet = () => { if (betAmount && status !== 'rolling' && !isAutoActive) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'rolling' && !isAutoActive) setBetAmount((Number(betAmount) * 2).toString()); };

  // Slider Drag Logic
  const handlePointerDown = (e, thumb) => {
    if (isAutoActive || status === 'rolling') return;
    isDragging.current = thumb;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    let percent = ((e.clientX - rect.left) / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    
    if (isDragging.current === 'min') {
      const newMin = Math.min(percent, maxVal - 1); // Maintain at least 1% gap
      setMinVal(parseFloat(newMin.toFixed(2)));
    } else {
      const newMax = Math.max(percent, minVal + 1);
      setMaxVal(parseFloat(newMax.toFixed(2)));
    }
  };

  const handlePointerUp = () => {
    isDragging.current = null;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  // Direct Input Handlers
  const handleMinChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    val = Math.min(Math.max(0, val), maxVal - 1);
    setMinVal(val);
  };

  const handleMaxChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    val = Math.max(Math.min(100, val), minVal + 1);
    setMaxVal(val);
  };

  const handleChanceChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    val = Math.max(0.01, Math.min(100, val));
    // Adjust maxVal keeping minVal fixed
    let newMax = minVal + val;
    if (newMax > 100) {
      newMax = 100;
      setMinVal(100 - val);
    }
    setMaxVal(newMax);
  };

  const handleMultChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 1.01) return;
    let newChance = 99 / val;
    handleChanceChange({ target: { value: newChance } });
  };

  const startRound = async () => {
    if (parseFloat(betAmount) < 0) return;
    setStatus('rolling');
    setCurrentRoll(null);
    
    try {
      const res = await api.post('/games/primedice/bet', { amount: parseFloat(betAmount) || 0, minVal, maxVal });
      const { roll, won, multiplier, payout } = res.data.data;
      const profit = won ? payout - parseFloat(betAmount) : -parseFloat(betAmount);
      const resultObj = { roll, win: won, profit };
      setCurrentRoll(resultObj);
      setHistory(prev => [resultObj, ...prev].slice(0, 10));
      setStatus('idle');
      fetchBalance();
    } catch (err) {
      console.error('PrimeDice bet failed:', err);
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
    if (!isAutoActive || status !== 'idle' || !currentRoll) return; // wait for idle and a roll
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
    }, 500);
    return () => clearTimeout(nextRoundTimer);
  }, [status, isAutoActive, autoBetsRemaining, currentRoll]);

  // Initial dummy history
  useEffect(() => {
    if (history.length === 0) {
      const dummy = Array.from({length: 10}, () => {
        const roll = parseFloat((Math.random() * 100).toFixed(2));
        return { roll, win: roll >= 36 && roll <= 59 };
      });
      setHistory(dummy);
    }
  }, []);

  return (
    <div className="pd-page">
      <div className="pd-panel">
        <div className="pd-mode-tabs">
          <button className={`pd-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`pd-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="pd-field">
          <div className="pd-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="pd-input-row">
            <div className="pd-input-wrap">
              <span className="pd-cur">Ł</span>
              <input
                type="number" className="pd-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'rolling' || isAutoActive} min="0" step="1"
              />
            </div>
            <button className="pd-sm-btn" onClick={halfBet} disabled={status === 'rolling' || isAutoActive}>½</button>
            <button className="pd-sm-btn" onClick={doubleBet} disabled={status === 'rolling' || isAutoActive}>2×</button>
          </div>
        </div>
        
        <div className="pd-field" style={{ marginTop: '4px' }}>
          <div className="pd-field-label"><span>Profit on Win</span><span>$0.00</span></div>
          <div className="pd-input-wrap disabled">
            <input type="text" className="pd-input" value={profitOnWin > 0 ? profitOnWin.toFixed(2) : '0'} readOnly />
            <span className="pd-cur">Ł</span>
          </div>
        </div>

        {mode === 'Auto' && (
          <div className="pd-field" style={{ marginTop: '12px' }}>
            <label className="pd-field-label">Number of Bets</label>
            <div className="pd-input-wrap">
              <input
                type="number" className="pd-input" placeholder="0"
                value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                disabled={isAutoActive} min="0" step="1"
              />
              <span className="pd-cur" style={{fontSize: 18, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
            </div>
          </div>
        )}

        {mode === 'Auto' ? (
          <button 
            className="pd-bet-btn" 
            style={{ marginTop: '20px' }}
            onClick={toggleAuto} 
            disabled={parseFloat(betAmount) < 0}
          >
            {isAutoActive ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        ) : (
          <button 
            className="pd-bet-btn" 
            style={{ marginTop: '20px' }}
            onClick={startRound} 
            disabled={status === 'rolling' || parseFloat(betAmount) < 0}
          >
            Bet
          </button>
        )}
      </div>

      <div className="pd-game-area">
        
        <div className="pd-history-track">
          {history.map((h, i) => (
            <div key={i} className={`pd-history-pill ${h.win ? 'win' : 'lose'}`}>
              {h.roll.toFixed(2)}
            </div>
          ))}
        </div>

        <div className="pd-board-wrapper">
          <div className="pd-machine">
            
            <div className="pd-slider-container">
              
              {/* Tick marks */}
              <div className="pd-ticks">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
              
              {/* Slider Track */}
              <div 
                className="pd-track" 
                ref={sliderRef}
                style={{
                  background: `linear-gradient(to right, #ff5555 ${minVal}%, #00e701 ${minVal}%, #00e701 ${maxVal}%, #ff5555 ${maxVal}%)`
                }}
              >
                
                {/* Result Indicator (if any) */}
                {currentRoll && (
                  <div className={`pd-roll-result ${currentRoll.win ? 'win' : 'lose'}`} style={{ left: `${currentRoll.roll}%` }}>
                    <div className="pd-roll-num">{currentRoll.roll.toFixed(2)}</div>
                    <div className="pd-roll-arrow"></div>
                  </div>
                )}
                
                {/* Min Thumb */}
                <div 
                  className="pd-thumb" 
                  style={{ left: `${minVal}%` }}
                  onPointerDown={(e) => handlePointerDown(e, 'min')}
                >
                  <span className="pd-thumb-icon">◀</span>
                </div>
                
                {/* Max Thumb */}
                <div 
                  className="pd-thumb" 
                  style={{ left: `${maxVal}%` }}
                  onPointerDown={(e) => handlePointerDown(e, 'max')}
                >
                  <span className="pd-thumb-icon">▶</span>
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Settings Footer (Inside Game Area) */}
        <div className="pd-settings-bar">
          
          <div className="pd-setting-group" style={{ flex: 2 }}>
            <label className="pd-set-label">Roll Between</label>
            <div className="pd-set-input-row">
              <div className="pd-input-wrap">
                <input type="number" className="pd-input" value={minVal.toFixed(2)} onChange={handleMinChange} disabled={status === 'rolling' || isAutoActive} step="1"/>
              </div>
              <span style={{color: '#b1bad3', fontWeight: 800}}>—</span>
              <div className="pd-input-wrap">
                <input type="number" className="pd-input" value={maxVal.toFixed(2)} onChange={handleMaxChange} disabled={status === 'rolling' || isAutoActive} step="1"/>
              </div>
            </div>
          </div>
          
          <div className="pd-setting-group">
            <label className="pd-set-label">Multiplier</label>
            <div className="pd-input-wrap">
              <input type="number" className="pd-input" value={multiplier.toFixed(4)} onChange={handleMultChange} disabled={status === 'rolling' || isAutoActive} step="0.01"/>
              <span className="pd-cur">×</span>
            </div>
          </div>
          
          <div className="pd-setting-group">
            <label className="pd-set-label">Win Chance</label>
            <div className="pd-input-wrap">
              <input type="number" className="pd-input" value={winChance.toFixed(4)} onChange={handleChanceChange} disabled={status === 'rolling' || isAutoActive} step="1"/>
              <span className="pd-cur">%</span>
            </div>
          </div>
          
        </div>

        <div className="pd-bottom-bar">
          <div className="pd-bl">
            <button className="pd-icon-btn">⚙</button>
            <button className="pd-icon-btn">⛶</button>
            <button className="pd-icon-btn">📊</button>
          </div>
          <div className="pd-brand">Kings</div>
          <div className="pd-br">
            <button className="pd-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
