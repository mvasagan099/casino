import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './wheel.css';

// Segment generation logic
const getSegments = (risk, segmentCount) => {
  let mults = [];
  if (risk === 'Low') {
    // Lots of small wins, few zeroes
    for (let i = 0; i < segmentCount; i++) {
      if (i % 5 === 0) mults.push(0.00); // 20% zeroes
      else if (i % 10 === 1) mults.push(1.50); // 10% 1.5x
      else mults.push(1.20); // 70% 1.2x
    }
  } else if (risk === 'Medium') {
    // Moderate zeroes, moderate wins
    for (let i = 0; i < segmentCount; i++) {
      if (i % 2 === 0) mults.push(0.00); // 50% zeroes
      else if (i % 10 === 1) mults.push(3.00); // 10% 3x
      else if (i % 4 === 1) mults.push(2.00); // 25% 2x
      else mults.push(1.50); // 15% 1.5x
    }
  } else if (risk === 'High') {
    // Lots of zeroes, few big wins
    for (let i = 0; i < segmentCount; i++) {
      if (i % 10 === 0) mults.push(9.90); // 10% 9.9x
      else mults.push(0.00); // 90% zeroes
    }
  }
  
  // Shuffle to make it look random (with a deterministic seed for simplicity or just random)
  // For standard presentation we just return it as is or slightly staggered
  return mults.map((m, index) => {
    let color = '#2f4553';
    if (m > 0 && m < 2) color = '#00e701';
    else if (m >= 2 && m < 3) color = '#1475e1';
    else if (m >= 3 && m < 5) color = '#ffb800';
    else if (m >= 5 && m < 10) color = '#e91e3f';
    else if (m >= 10) color = '#9c27b0';

    return { multiplier: m, color, id: index };
  });
};

export default function WheelGame() {
  const { fetchBalance, balance } = useWallet();
  const [betAmount, setBetAmount] = useState('0');
  const [risk, setRisk] = useState('Medium');
  const [segmentCount, setSegmentCount] = useState(30);
  const [status, setStatus] = useState('idle'); // idle, spinning, finished
  const [currentRotation, setCurrentRotation] = useState(0);
  const [resultMult, setResultMult] = useState(null);
  const [history, setHistory] = useState([]);

  // Auto bet state
  const [mode, setMode] = useState('Manual');
  const [autoBetsCount, setAutoBetsCount] = useState('0'); // 0 means infinite
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);

  // Auto bet effect
  useEffect(() => {
    if (isAutoActive && status === 'finished') {
      const timer = setTimeout(() => {
        if (!isAutoActive) return; // double check in case stopped

        if (autoBetsRemaining > 0) {
          setAutoBetsRemaining(prev => prev - 1);
          executeBet();
        } else if (autoBetsRemaining === -1) { // infinite
          executeBet();
        } else {
          setIsAutoActive(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, isAutoActive, autoBetsRemaining]);

  const executeBet = async () => {
    const amount = parseFloat(betAmount);
    if (amount < 0) {
      if (isAutoActive) setIsAutoActive(false);
      return;
    }
    
    setStatus('spinning');
    setResultMult(null);
    
    try {
      const res = await api.post('/games/wheel/bet', {
        amount,
        risk: risk.toLowerCase()
      });

      if (res.data.success) {
        const { segmentIndex, multiplier, profit, won } = res.data.data;
        const winSegment = segments[segmentIndex];
        
        const segmentAngle = 360 / segmentCount;
        const targetCenterAngle = (segmentIndex + 0.5) * segmentAngle;
        
        const spins = 5;
        const newBaseRotation = spins * 360 + (360 - targetCenterAngle);
        
        setCurrentRotation(prev => prev + newBaseRotation - (prev % 360));

        setTimeout(() => {
          setStatus('finished');
          setResultMult(multiplier);
          
          setHistory(prev => [{
            mult: multiplier,
            profit,
            win: won
          }, ...prev].slice(0, 10));

          fetchBalance();
        }, 3000);
      }
    } catch (err) {
      console.error('Wheel bet failed:', err);
      setStatus('finished');
      if (isAutoActive) setIsAutoActive(false);
    }
  };

  const handleBet = () => {
    if (parseFloat(betAmount) < 0 || status === 'spinning') return;
    executeBet();
  };

  const toggleAuto = () => {
    if (isAutoActive) {
      setIsAutoActive(false);
    } else {
      if (parseFloat(betAmount) < 0) return;
      const count = parseInt(autoBetsCount) || 0;
      setAutoBetsRemaining(count > 0 ? count - 1 : -1);
      setIsAutoActive(true);
      executeBet();
    }
  };

  const segments = getSegments(risk, segmentCount);

  const halfBet = () => { if (betAmount && status !== 'spinning') setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'spinning') setBetAmount((Number(betAmount) * 2).toString()); };

  // Removed duplicate handleBet logic here since it's replaced above

  // Rendering SVG segments
  const renderWheel = () => {
    const radius = 180;
    const strokeWidth = 30; // The thickness of the wheel donut
    const center = 200;
    const segmentAngle = 360 / segmentCount;

    return segments.map((seg, i) => {
      const startAngle = i * segmentAngle;
      const endAngle = (i + 1) * segmentAngle;
      
      // Calculate SVG arc paths
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
      ].join(' ');

      return (
        <path
          key={i}
          d={pathData}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          // Slight gap between segments to look like discrete blocks
          strokeDasharray="calc(100% - 2px) 2px"
        />
      );
    });
  };

  // unique multipliers for the legend
  const uniqueMults = [...new Set(segments.map(s => s.multiplier))].sort((a,b) => a-b);

  return (
    <div className="wheel-page">
      <div className="wheel-panel">
        <div className="wheel-mode-tabs">
          <button className={`wheel-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`wheel-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="wheel-field">
          <div className="wheel-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="wheel-input-row">
            <div className="wheel-input-wrap">
              <span className="wheel-cur">Ł</span>
              <input
                type="number" className="wheel-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'spinning'} min="0" step="1"
              />
            </div>
            <button className="wheel-sm-btn" onClick={halfBet} disabled={status === 'spinning'}>½</button>
            <button className="wheel-sm-btn" onClick={doubleBet} disabled={status === 'spinning'}>2×</button>
          </div>
        </div>

        <div className="wheel-field">
          <label className="wheel-field-label">Risk</label>
          <select 
            className="wheel-select" 
            value={risk}
            onChange={e => setRisk(e.target.value)}
            disabled={status === 'spinning' || isAutoActive}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="wheel-field">
          <label className="wheel-field-label">Segments</label>
          <select 
            className="wheel-select" 
            value={segmentCount}
            onChange={e => setSegmentCount(parseInt(e.target.value))}
            disabled={status === 'spinning' || isAutoActive}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="40">40</option>
            <option value="50">50</option>
          </select>
        </div>

        {mode === 'Auto' && (
          <div className="wheel-field">
            <label className="wheel-field-label">Number of Bets</label>
            <div className="wheel-input-wrap">
              <input
                type="number" className="wheel-input" placeholder="0"
                value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                disabled={isAutoActive} min="0" step="1"
              />
              <span className="wheel-cur" style={{fontSize: 18, marginRight: 4, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
            </div>
          </div>
        )}

        {mode === 'Auto' ? (
          <button 
            className="wheel-bet-btn" 
            onClick={toggleAuto} 
            disabled={parseFloat(betAmount) < 0}
          >
            {isAutoActive ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        ) : (
          <button 
            className="wheel-bet-btn" 
            onClick={handleBet} 
            disabled={parseFloat(betAmount) < 0 || status === 'spinning'}
          >
            Bet
          </button>
        )}
      </div>

      <div className="wheel-game-area">
        <div className="wheel-board-wrapper">
          
          <div className="wheel-container">
            {/* The pin indicator at the top */}
            <div className="wheel-pin"></div>
            
            {/* The actual spinning wheel */}
            <div 
              className="wheel-svg-wrapper"
              style={{
                transform: `rotate(${currentRotation}deg)`,
                transition: status === 'spinning' ? 'transform 3s cubic-bezier(0.12, 0.8, 0.32, 1)' : 'none'
              }}
            >
              <svg width="400" height="400" viewBox="0 0 400 400" className="wheel-svg">
                {/* Background track (optional, if gaps are present) */}
                <circle cx="200" cy="200" r="180" fill="none" stroke="#1a2c38" strokeWidth="30" />
                
                {renderWheel()}
              </svg>
            </div>
            
            {/* Center Hub Display */}
            <div className={`wheel-center-hub ${status === 'finished' ? (resultMult > 0 ? 'win' : 'loss') : ''}`}>
              {status === 'idle' && resultMult === null && (
                <div className="hub-idle">Wheel</div>
              )}
              {status === 'spinning' && (
                <div className="hub-spinning">Spinning...</div>
              )}
              {status === 'finished' && resultMult !== null && (
                <div className="hub-result">
                  <div className="hub-mult">{resultMult.toFixed(2)}×</div>
                  <div className="hub-profit">
                    {resultMult > 0 ? '+' : ''}
                    {((parseFloat(betAmount) * resultMult) - parseFloat(betAmount)).toFixed(2)} Ł
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Legend / Recent History area */}
        <div className="wheel-legend">
          {uniqueMults.map((m, idx) => {
            let color = '#2f4553';
            if (m > 0 && m < 2) color = '#00e701';
            else if (m >= 2 && m < 3) color = '#1475e1';
            else if (m >= 3 && m < 5) color = '#ffb800';
            else if (m >= 5 && m < 10) color = '#e91e3f';
            else if (m >= 10) color = '#9c27b0';
            
            return (
              <div key={idx} className="legend-item" style={{ borderBottomColor: color }}>
                {m.toFixed(2)}×
              </div>
            );
          })}
        </div>

        <div className="wheel-bottom-bar">
          <div className="wheel-bl">
            <button className="wheel-icon-btn">⚙</button>
            <button className="wheel-icon-btn">⛶</button>
            <button className="wheel-icon-btn">📊</button>
          </div>
          <div className="wheel-brand">Kings</div>
          <div className="wheel-br">
            <button className="wheel-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
