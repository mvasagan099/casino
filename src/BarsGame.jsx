import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './bars.css';

// Approximate probability tables for a ~98% RTP.
// These represent the possible multipliers on each tile.
const MULTIPLIERS = {
  Easy: [
    { val: 0.12, prob: 40 },
    { val: 0.18, prob: 30 },
    { val: 0.24, prob: 15 },
    { val: 0.36, prob: 10 },
    { val: 0.80, prob: 4 },
    { val: 2.50, prob: 1 }
  ],
  Medium: [
    { val: 0.06, prob: 30 },
    { val: 0.12, prob: 35 },
    { val: 0.24, prob: 20 },
    { val: 0.28, prob: 8 },
    { val: 0.60, prob: 5 },
    { val: 1.20, prob: 1.5 },
    { val: 6.60, prob: 0.5 }
  ],
  Hard: [
    { val: 0.01, prob: 40 },
    { val: 0.05, prob: 30 },
    { val: 0.15, prob: 15 },
    { val: 0.50, prob: 10 },
    { val: 2.00, prob: 4 },
    { val: 15.0, prob: 1 }
  ],
  Expert: [
    { val: 0.00, prob: 50 },
    { val: 0.02, prob: 25 },
    { val: 0.10, prob: 15 },
    { val: 0.50, prob: 7 },
    { val: 5.00, prob: 2.8 },
    { val: 50.0, prob: 0.2 }
  ]
};

const pickRandomMultiplier = (difficulty) => {
  const table = MULTIPLIERS[difficulty];
  const r = Math.random() * 100;
  let cum = 0;
  for (let item of table) {
    cum += item.prob;
    if (r <= cum) return item.val;
  }
  return table[0].val; // fallback
};

export default function BarsGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [difficulty, setDifficulty] = useState('Medium');
  
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [revealedBoard, setRevealedBoard] = useState(null); // array of 30 multipliers
  const [status, setStatus] = useState('idle'); // idle, flipping, resolved
  
  const [resultMsg, setResultMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [hoveredLegend, setHoveredLegend] = useState(null);
  
  // Auto mode
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsCount, setAutoBetsCount] = useState('0');
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);

  const halfBet = () => { if (betAmount && status !== 'flipping' && !isAutoActive) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'flipping' && !isAutoActive) setBetAmount((Number(betAmount) * 2).toString()); };

  const toggleTile = (index) => {
    if (status === 'flipping' || isAutoActive || status === 'resolved') {
      // If round is over and we click a tile, we clear the board and start a new selection
      if (status === 'resolved') {
        setStatus('idle');
        setRevealedBoard(null);
        setResultMsg(null);
        setSelectedTiles([index]);
        return;
      }
      return; 
    }
    
    setSelectedTiles(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        if (prev.length >= 5) return prev; // max 5
        return [...prev, index];
      }
    });
  };

  const randomPick = () => {
    if (status === 'flipping' || isAutoActive) return;
    setStatus('idle');
    setRevealedBoard(null);
    setResultMsg(null);
    
    const count = Math.floor(Math.random() * 5) + 1; // 1 to 5 tiles
    const picks = new Set();
    while(picks.size < count) {
      picks.add(Math.floor(Math.random() * 30));
    }
    setSelectedTiles(Array.from(picks));
  };

  const clearTable = () => {
    if (status === 'flipping' || isAutoActive) return;
    setStatus('idle');
    setRevealedBoard(null);
    setResultMsg(null);
    setSelectedTiles([]);
  };

  const startRound = async () => {
    const amount = parseFloat(betAmount);
    if (amount < 0 || selectedTiles.length === 0 || selectedTiles.length > 5) {
      if (isAutoActive) setIsAutoActive(false);
      return;
    }
    
    setStatus('flipping');
    setResultMsg(null);
    setErrorMsg(null);
    
    try {
      const res = await api.post('/games/bars/bet', {
        amount,
        difficulty: difficulty.toLowerCase(),
        tiles: selectedTiles
      });

      if (res.data.success) {
        const { grid, multiplier, payout, profit } = res.data.data;
        setRevealedBoard(grid);
        
        setTimeout(() => {
          setResultMsg({ mult: multiplier, winAmount: payout, profit });
          setStatus('resolved');
          fetchBalance();
        }, 1000);
      }
    } catch (err) {
      console.error('Bars bet failed:', err);
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Bet failed');
      setStatus('idle');
      if (isAutoActive) setIsAutoActive(false);
    }
  };

  const toggleAuto = () => {
    if (isAutoActive) {
      setIsAutoActive(false);
    } else {
      if (parseFloat(betAmount) < 0 || selectedTiles.length === 0) return;
      
      // If we are starting auto and the board was previously resolved, reset visual state
      if (status === 'resolved') {
        setStatus('idle');
        setRevealedBoard(null);
        setResultMsg(null);
      }
      
      const count = parseInt(autoBetsCount) || 0;
      setAutoBetsRemaining(count > 0 ? count - 1 : -1);
      setIsAutoActive(true);
      // Wait a tick for visual reset then start
      setTimeout(() => startRound(), 50);
    }
  };

  useEffect(() => {
    if (!isAutoActive || status !== 'resolved') return;
    const nextRoundTimer = setTimeout(() => {
      if (!isAutoActive) return;
      if (autoBetsRemaining > 0) {
        setAutoBetsRemaining(prev => prev - 1);
        setStatus('idle');
        setRevealedBoard(null);
        setResultMsg(null);
        setTimeout(() => startRound(), 50);
      } else if (autoBetsRemaining === -1) {
        setStatus('idle');
        setRevealedBoard(null);
        setResultMsg(null);
        setTimeout(() => startRound(), 50);
      } else {
        setIsAutoActive(false);
      }
    }, 1500); // 1.5s delay between auto rounds
    return () => clearTimeout(nextRoundTimer);
  }, [status, isAutoActive, autoBetsRemaining]);

  const getTileColor = (val) => {
    if (val >= 1.0) return '#00e701'; // green text
    if (val >= 0.2) return '#ffb800'; // yellow/gold
    return '#b1bad3'; // default grey
  };

  return (
    <div className="bars-page">
      <div className="bars-panel">
        <div className="bars-mode-tabs">
          <button className={`bars-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`bars-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="bars-field">
          <div className="bars-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="bars-input-row">
            <div className="bars-input-wrap">
              <span className="bars-cur">Ł</span>
              <input
                type="number" className="bars-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'flipping' || isAutoActive} min="0" step="1"
              />
            </div>
            <button className="bars-sm-btn" onClick={halfBet} disabled={status === 'flipping' || isAutoActive}>½</button>
            <button className="bars-sm-btn" onClick={doubleBet} disabled={status === 'flipping' || isAutoActive}>2×</button>
          </div>
        </div>
        
        <div className="bars-field">
          <label className="bars-field-label">Difficulty</label>
          <div className="bars-input-wrap">
            <select 
              className="bars-select" 
              value={difficulty} 
              onChange={(e) => {
                setDifficulty(e.target.value);
                if (status === 'resolved') {
                  setStatus('idle');
                  setRevealedBoard(null);
                  setResultMsg(null);
                }
              }}
              disabled={status === 'flipping' || isAutoActive}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>

        {mode === 'Auto' && (
          <div className="bars-field" style={{ marginTop: '12px' }}>
            <label className="bars-field-label">Number of Bets</label>
            <div className="bars-input-wrap">
              <input
                type="number" className="bars-input" placeholder="0"
                value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                disabled={isAutoActive} min="0" step="1"
              />
              <span className="bars-cur" style={{fontSize: 18, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
            </div>
          </div>
        )}

        <div className="bars-field" style={{ marginTop: '12px', gap: '8px' }}>
          <button className="bars-util-btn" onClick={randomPick} disabled={status === 'flipping' || isAutoActive}>Random Pick</button>
          <button className="bars-util-btn clear" onClick={clearTable} disabled={status === 'flipping' || isAutoActive}>Clear Table</button>
        </div>

        <button 
          className="bars-bet-btn" 
          style={{ marginTop: '12px' }}
          onClick={mode === 'Auto' ? toggleAuto : startRound} 
          disabled={(mode === 'Manual' && status === 'flipping') || parseFloat(betAmount) < 0 || isNaN(parseFloat(betAmount)) || selectedTiles.length === 0}
        >
          {mode === 'Auto' ? (isAutoActive ? 'Stop Autobet' : 'Start Autobet') : 'Bet'}
        </button>
        
        {errorMsg && (
          <div style={{ color: '#ff4d4d', marginTop: '10px', fontSize: '14px', textAlign: 'center', backgroundColor: 'rgba(255, 77, 77, 0.1)', padding: '8px', borderRadius: '4px' }}>
            {errorMsg}
          </div>
        )}
        
      </div>

      <div className="bars-game-area">
        
        <div className="bars-board-wrapper">
          <div className="bars-grid">
            {Array.from({length: 30}).map((_, i) => {
              const isSelected = selectedTiles.includes(i);
              const isRevealed = revealedBoard !== null;
              const val = isRevealed ? revealedBoard[i] : null;
              
              return (
                <div 
                  key={i} 
                  className={`bars-tile ${isSelected ? 'selected' : ''} ${isRevealed ? 'revealed' : ''}`}
                  onClick={() => toggleTile(i)}
                  style={{ '--flip-delay': `${(i % 5) * 50 + Math.floor(i / 5) * 30}ms` }}
                >
                  <div className="bars-tile-inner">
                    <div className="bars-tile-front"></div>
                    <div className="bars-tile-back">
                      {isRevealed && (
                        <span style={{ color: getTileColor(val) }}>{val.toFixed(2)}×</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Result Overlay Popup */}
          {status === 'resolved' && resultMsg && (
            <div className="bars-result-popup">
              <div className="bars-res-mult">{resultMsg.mult.toFixed(2)}×</div>
              <div className="bars-res-profit">{resultMsg.profit > 0 ? '+' : ''}{resultMsg.profit.toFixed(2)} Ł</div>
            </div>
          )}
        </div>
        
        {/* Helper text below board */}
        <div className="bars-instruction">
          {selectedTiles.length === 0 ? 'Select 1 - 5 bars to play' : `Selected: ${selectedTiles.length} / 5`}
        </div>

        {/* Legend of available multipliers for current difficulty */}
        <div className="bars-legend-wrapper">
          {hoveredLegend && (
            <div className="bars-legend-tooltip" style={{ left: hoveredLegend.x }}>
              <div className="bl-tooltip-row">
                <div className="bars-field" style={{ flex: 1 }}>
                  <div className="bars-field-label"><span>Profit on Win</span><span style={{color: '#fff'}}>$0.00</span></div>
                  <div className="bars-input-wrap disabled" style={{ backgroundColor: '#0f212e', border: '1px solid #2f4553' }}>
                    <input type="text" className="bars-input" value={hoveredLegend.profit.toFixed(2)} readOnly />
                    <span className="bars-cur">Ł</span>
                  </div>
                </div>
                <div className="bars-field" style={{ flex: 1 }}>
                  <label className="bars-field-label">Win Chance</label>
                  <div className="bars-input-wrap disabled" style={{ backgroundColor: '#0f212e', border: '1px solid #2f4553' }}>
                    <input type="text" className="bars-input" value={hoveredLegend.chance.toFixed(2)} readOnly />
                    <span className="bars-cur">%</span>
                  </div>
                </div>
              </div>
              <div className="bl-tooltip-arrow"></div>
            </div>
          )}
          <div className="bars-legend">
            {MULTIPLIERS[difficulty].map((m, idx) => (
              <div 
                key={idx} 
                className="bars-legend-item"
                onMouseEnter={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  const parentRect = e.target.parentElement.getBoundingClientRect();
                  const bet = parseFloat(betAmount) || 0;
                  setHoveredLegend({
                    x: rect.left - parentRect.left + (rect.width / 2),
                    profit: (bet * m.val) - bet,
                    chance: m.prob
                  });
                }}
                onMouseLeave={() => setHoveredLegend(null)}
              >
                {m.val.toFixed(2)}×
              </div>
            ))}
          </div>
        </div>

        <div className="bars-bottom-bar">
          <div className="bars-bl">
            <button className="bars-icon-btn">⚙</button>
            <button className="bars-icon-btn">⛶</button>
            <button className="bars-icon-btn">📊</button>
          </div>
          <div className="bars-brand">Kings</div>
          <div className="bars-br">
            <button className="bars-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
