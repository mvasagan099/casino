import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './keno.css';

// Approximate Kings Keno multipliers
const MULTIPLIERS = {
  High: {
    1: [0, 3.8],
    2: [0, 0, 16],
    3: [0, 0, 0, 81],
    4: [0, 0, 0, 10, 270],
    5: [0, 0, 0, 4.5, 48, 850],
    6: [0, 0, 0, 0, 12, 120, 2100],
    7: [0, 0, 0, 0, 3.5, 24, 500, 7100],
    8: [0, 0, 0, 0, 0, 14, 120, 1300, 25000],
    9: [0, 0, 0, 0, 0, 5, 55, 400, 4000, 90000],
    10:[0, 0, 0, 0, 0, 4, 35, 150, 1200, 12000, 250000]
  },
  Medium: {
    1: [0, 3.2],
    2: [0, 0, 8.6],
    3: [0, 1.1, 1.4, 25],
    4: [0, 0, 1.7, 5.5, 65],
    5: [0, 0, 1.2, 2.8, 14, 160],
    6: [0, 0, 0, 1.6, 5.5, 40, 400],
    7: [0, 0, 0, 1.2, 3.2, 16, 120, 1000],
    8: [0, 0, 0, 1, 2.4, 8, 40, 350, 2500],
    9: [0, 0, 0, 0.8, 2, 5.5, 20, 100, 900, 5000],
    10:[0, 0, 0, 0, 1.7, 4, 11, 45, 250, 1300, 5000]
  },
  Low: {
    1: [0, 2.8],
    2: [0, 1.2, 5.6],
    3: [0, 1, 1.8, 8.5],
    4: [0, 0.8, 1.4, 3.5, 15],
    5: [0, 0, 1.2, 2, 6, 30],
    6: [0, 0, 1, 1.5, 3, 10, 50],
    7: [0, 0, 0.8, 1.3, 2.5, 7, 25, 80],
    8: [0, 0, 0, 1.2, 2.1, 5, 15, 50, 120],
    9: [0, 0, 0, 1.1, 1.8, 3.5, 8, 25, 75, 250],
    10:[0, 0, 0, 1, 1.6, 2.8, 5, 15, 50, 150, 400]
  }
};

function formatMult(m) {
  if (m >= 1000) return (m/1000).toLocaleString() + 'K×';
  if (m >= 100) return m.toFixed(1).replace(/\.0$/, '') + '×';
  return m.toFixed(2) + '×';
}

function combinations(n, r) {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  let result = 1;
  for (let i = 1; i <= r; i++) {
    result = (result * (n - i + 1)) / i;
  }
  return result;
}

function calculateChance(spots, hits) {
  if (spots === 0) return 0;
  const N = 40;
  const n = 10;
  if (hits > spots || hits > n) return 0;
  if (N - spots < n - hits) return 0;
  
  const num = combinations(spots, hits) * combinations(N - spots, n - hits);
  const den = combinations(N, n);
  return (num / den) * 100;
}

export default function KenoGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [betting, setBetting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [hoveredHits, setHoveredHits] = useState(null);

  // Auto bet state
  const [numBets, setNumBets] = useState('0');
  const [autobetting, setAutobetting] = useState(false);
  const autobetRef = useRef(false);
  const autoIntervalRef = useRef(null);
  const betsRemRef = useRef(0);

  const toggleNumber = (num) => {
    if (betting || autobetting) return;
    setDrawnNumbers([]);
    setLastResult(null);

    setSelectedNumbers(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else {
        if (prev.length >= 10) return prev;
        return [...prev, num];
      }
    });
  };

  const clearTable = () => {
    if (betting || autobetting) return;
    setSelectedNumbers([]);
    setDrawnNumbers([]);
    setLastResult(null);
  };

  const randomPick = () => {
    if (betting || autobetting) return;
    setDrawnNumbers([]);
    setLastResult(null);
    const count = 10;
    const picks = new Set();
    while (picks.size < count) {
      picks.add(Math.floor(Math.random() * 40) + 1);
    }
    setSelectedNumbers(Array.from(picks));
  };

  const handleDraw = async () => {
    const amount = parseFloat(betAmount || '0');
    if (amount < 0 || selectedNumbers.length === 0) {
      if (!autobetRef.current) setBetting(false);
      return;
    }

    try {
      const res = await api.post('/games/keno/bet', {
        amount,
        picks: selectedNumbers
      });

      if (res.data.success) {
        const { draw, hits, multiplier, won, payout } = res.data.data;
        setDrawnNumbers(draw);
        setLastResult({ matches: hits, multiplier, won, payout });
        fetchBalance();
      }
    } catch (err) {
      console.error('Keno bet failed:', err);
    }

    // End manual bet round if no autobet
    if (!autobetRef.current) {
      setBetting(false);
    }
  };

  const handleBet = () => {
    if (parseFloat(betAmount) < 0 || selectedNumbers.length === 0 || betting) return;
    setBetting(true);
    setLastResult(null);
    setDrawnNumbers([]);
    
    // Simulate API delay
    setTimeout(() => {
      handleDraw();
    }, 200);
  };

  const startAutobet = () => {
    if (parseFloat(betAmount) < 0 || selectedNumbers.length === 0) return;
    setAutobetting(true);
    autobetRef.current = true;
    setBetting(true);
    
    let rem = parseInt(numBets, 10);
    if (isNaN(rem) || rem < 0) rem = 0;
    betsRemRef.current = rem;

    const runRound = () => {
      setLastResult(null);
      setDrawnNumbers([]);
      setTimeout(() => {
        handleDraw();
        
        if (betsRemRef.current > 0) betsRemRef.current--;
        
        if (betsRemRef.current === 0 && rem !== 0) {
          stopAutobet();
        }
      }, 100);
    };

    runRound();
    if (betsRemRef.current === 0 && rem !== 0) return;

    autoIntervalRef.current = setInterval(runRound, 600);
  };

  const stopAutobet = () => {
    setAutobetting(false);
    autobetRef.current = false;
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    setBetting(false);
  };

  useEffect(() => () => {
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
  }, []);

  const halfBet = () => { if (betAmount) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount) setBetAmount((Number(betAmount) * 2).toString()); };

  const getNumberClass = (num) => {
    const isSelected = selectedNumbers.includes(num);
    const isDrawn = drawnNumbers.includes(num);
    if (isSelected && isDrawn) return 'keno-num match';
    if (isSelected) return 'keno-num selected';
    if (isDrawn) return 'keno-num drawn';
    return 'keno-num';
  };

  const activePayouts = selectedNumbers.length > 0 ? MULTIPLIERS[difficulty][selectedNumbers.length] : null;

  return (
    <div className="keno-page">
      <div className="keno-panel">
        <div className="keno-mode-tabs">
          {['Manual', 'Auto'].map(m => (
            <button key={m} className={`keno-mode-tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>

        <div className="keno-field">
          <div className="keno-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="keno-input-row">
            <div className="keno-input-wrap">
              <span className="keno-cur">Ł</span>
              <input
                type="number" className="keno-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || betting} min="0" step="1"
              />
            </div>
            <button className="keno-sm-btn" onClick={halfBet} disabled={betting}>½</button>
            <button className="keno-sm-btn" onClick={doubleBet} disabled={betting}>2×</button>
          </div>
        </div>

        <div className="keno-field">
          <label className="keno-field-label">Difficulty</label>
          <select className="keno-select" value={difficulty}
            onChange={e => { setDifficulty(e.target.value); setLastResult(null); }}
            disabled={betting}>
            {['Low', 'Medium', 'High'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {mode === 'Auto' && (
          <div className="keno-field">
            <label className="keno-field-label">Number of Bets</label>
            <div className="keno-input-wrap">
              <input
                type="number" className="keno-input" placeholder="0"
                value={numBets} onChange={e => setNumBets(e.target.value)}
                disabled={betting} min="0" step="1"
              />
              <span style={{color: '#b1bad3', fontSize: '18px', paddingLeft: '8px'}}>∞</span>
            </div>
          </div>
        )}

        <div className="keno-controls-row">
          <button className="keno-sec-btn" onClick={randomPick} disabled={betting}>Random Pick</button>
          <button className="keno-sec-btn" onClick={clearTable} disabled={betting}>Clear Table</button>
        </div>

        {mode === 'Manual' ? (
          <button className={`keno-bet-btn ${betting || selectedNumbers.length === 0 ? 'disabled' : ''}`} onClick={handleBet} disabled={betting || selectedNumbers.length === 0}>
            Bet
          </button>
        ) : (
          <button
            className={`keno-bet-btn ${autobetting ? 'dropping' : (selectedNumbers.length === 0 ? 'disabled' : '')}`}
            onClick={autobetting ? stopAutobet : startAutobet}
            disabled={selectedNumbers.length === 0 && !autobetting}
          >
            {autobetting ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        )}

        {lastResult && (
          <div className={`keno-result ${lastResult.multiplier >= 1 ? 'won' : 'lost'}`}>
            <div className="keno-result-mult">{lastResult.multiplier}×</div>
            <div className="keno-result-sub">
              {lastResult.multiplier >= 1
                ? `+${(parseFloat(betAmount || 0) * lastResult.multiplier).toFixed(2)} Ł`
                : `Lost ${betAmount || '0'} Ł`}
            </div>
          </div>
        )}
      </div>

      <div className="keno-game-area">
        <div className="keno-board-container">
          <div className="keno-board">
            {Array.from({ length: 40 }).map((_, i) => {
              const num = i + 1;
              return (
                <button
                  key={num}
                  className={getNumberClass(num)}
                  onClick={() => toggleNumber(num)}
                >
                  {num}
                </button>
              );
            })}
          </div>
          
          <div className="keno-payouts">
            <div className="keno-payout-text">
              {selectedNumbers.length === 0 
                ? "Select 1 - 10 numbers to play"
                : `${selectedNumbers.length} numbers selected`}
            </div>
            
            {activePayouts && (
              <div className="keno-payout-track" style={{ position: 'relative' }}>
                {hoveredHits !== null && (
                  <div className="keno-hover-tooltip">
                    <div 
                      className="keno-tooltip-arrow" 
                      style={{ left: `calc(${((hoveredHits + 0.5) / activePayouts.length) * 100}% - 8px)` }}
                    ></div>
                    <div className="keno-tooltip-content">
                      <div className="keno-tooltip-field">
                        <div className="keno-tooltip-label">Payout</div>
                        <div className="keno-tooltip-input">
                          {activePayouts[hoveredHits].toFixed(2)}
                        </div>
                      </div>
                      <div className="keno-tooltip-field profit">
                        <div className="keno-tooltip-label">
                          <span>Profit on Win</span>
                          <span>$0.00</span>
                        </div>
                        <div className="keno-tooltip-input">
                          {((parseFloat(betAmount || 0) * activePayouts[hoveredHits]) - parseFloat(betAmount || 0)).toFixed(2)}
                          <span className="keno-cur">Ł</span>
                        </div>
                      </div>
                      <div className="keno-tooltip-field">
                        <div className="keno-tooltip-label">Chance</div>
                        <div className="keno-tooltip-input">
                          {calculateChance(selectedNumbers.length, hoveredHits).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activePayouts.map((mult, hits) => (
                  <div 
                    key={hits} 
                    className={`keno-payout-col ${lastResult && lastResult.matches === hits ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredHits(hits)}
                    onMouseLeave={() => setHoveredHits(null)}
                  >
                    <div className="keno-payout-mult-box">
                      {formatMult(mult)}
                    </div>
                    <div className="keno-payout-hits-box">
                      {hits}× <div className="keno-hit-icon"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="keno-bottom-bar">
          <div className="keno-bl">
            <button className="keno-icon-btn">⚙</button>
            <button className="keno-icon-btn">⛶</button>
            <button className="keno-icon-btn">📊</button>
            <button className="keno-icon-btn">↗</button>
          </div>
          <div className="keno-brand">Kings</div>
          <div className="keno-br">
            <button className="keno-fair-btn">🛡 Fairness</button>
            <button className="keno-icon-btn">🎧</button>
          </div>
        </div>
      </div>
    </div>
  );
}
