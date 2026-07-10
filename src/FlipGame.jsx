import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './flip.css';

const Coin = ({ predicted, outcome, flipCount, size = 'large', index = -1, interactive, onClick }) => {
  const [rotation, setRotation] = useState(0);
  const prevCountRef = useRef(flipCount);

  useEffect(() => {
    if (flipCount > prevCountRef.current) {
      const spins = 5;
      const base = (flipCount * spins) * 360;
      const finalDeg = base + (outcome === 'tails' ? 180 : 0);
      setRotation(finalDeg);
      prevCountRef.current = flipCount;
    }
  }, [flipCount, outcome]);

  useEffect(() => {
    if (!outcome) {
      // Snap to predicted face if no outcome is active
      setRotation(predicted === 'tails' ? 180 : 0);
    }
  }, [predicted, outcome]);

  return (
    <div className={`flip-coin-wrapper ${size}`} onClick={interactive ? onClick : undefined}>
      {index !== -1 && <div className="coin-badge">{index + 1}</div>}
      <div className="flip-coin" style={{ transform: `rotateY(${rotation}deg)` }}>
        <div className="coin-face coin-heads"><div className="heads-inner"></div></div>
        <div className="coin-face coin-tails"><div className="tails-inner"></div></div>
      </div>
    </div>
  );
};

export default function FlipGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('manual');
  const [betAmount, setBetAmount] = useState('0');
  const [status, setStatus] = useState('idle'); // 'idle', 'flipping'
  const [history, setHistory] = useState([]);
  const [profit, setProfit] = useState(0);
  const [lastWin, setLastWin] = useState(null);
  
  const [flipTrigger, setFlipTrigger] = useState(0);
  const [outcomes, setOutcomes] = useState([]);

  // Manual State
  const [manualSide, setManualSide] = useState('heads');
  
  // Auto State
  const [numFlips, setNumFlips] = useState(5);
  const [autoSequence, setAutoSequence] = useState(Array(5).fill('heads'));
  const [numBets, setNumBets] = useState(0);
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [betsRemaining, setBetsRemaining] = useState(0);

  const getMultiplier = (n) => 0.98 * Math.pow(2, n);

  const startGame = async () => {
    if (parseFloat(betAmount) < 0 || status === 'flipping') return;
    setStatus('flipping');
    setLastWin(null);
    
    const n = mode === 'manual' ? 1 : numFlips;
    const prediction = mode === 'manual' ? [manualSide] : autoSequence.slice(0, n);
    
    try {
      const res = await api.post('/games/flip/bet', { amount: parseFloat(betAmount) || 0, prediction, numCoins: n });
      const { outcomes: newOutcomes, won, multiplier: mult } = res.data.data;
      
      setOutcomes(newOutcomes);
      setFlipTrigger(prev => prev + 1);
      
      setTimeout(() => {
        if (won) {
          setProfit((parseFloat(betAmount) * mult).toFixed(2));
          setLastWin(true);
        } else {
          setProfit(0);
          setLastWin(false);
        }
        setHistory(prev => [...prev, newOutcomes[0]].slice(-20));
        setStatus('idle');
        fetchBalance();
      }, 1500);
    } catch (err) {
      console.error('Flip bet failed:', err);
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (isAutoBetting && status === 'idle') {
      if (numBets !== 0 && betsRemaining <= 0) {
        setIsAutoBetting(false);
        return;
      }
      const timer = setTimeout(() => {
        if (numBets !== 0) setBetsRemaining(b => b - 1);
        startGame();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAutoBetting, status, betsRemaining, numBets]);

  const toggleMode = (m) => {
    if (status === 'flipping' || isAutoBetting) return;
    setMode(m);
    setLastWin(null);
    setOutcomes([]);
  };

  const handleNumFlipsChange = (n) => {
    setNumFlips(n);
    setAutoSequence(Array(n).fill('heads'));
    setLastWin(null);
    setOutcomes([]);
  };

  const halfBet = () => { if (betAmount && status === 'idle' && !isAutoBetting) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status === 'idle' && !isAutoBetting) setBetAmount((Number(betAmount) * 2).toString()); };

  const handleRandomPick = () => {
    if (status === 'flipping' || isAutoBetting) return;
    if (mode === 'manual') {
      setManualSide(Math.random() < 0.5 ? 'heads' : 'tails');
    } else {
      const newSeq = [];
      for(let i=0; i<numFlips; i++) newSeq.push(Math.random() < 0.5 ? 'heads' : 'tails');
      setAutoSequence(newSeq);
      setLastWin(null);
      setOutcomes([]);
    }
  };

  const startAutoBet = () => {
    if (parseFloat(betAmount) < 0) return;
    setBetsRemaining(numBets);
    setIsAutoBetting(true);
  };

  return (
    <div className="flip-page">
      <div className="flip-panel">
        <div className="flip-mode-tabs">
          <button className={`flip-mode-tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => toggleMode('manual')}>Manual</button>
          <button className={`flip-mode-tab ${mode === 'auto' ? 'active' : ''}`} onClick={() => toggleMode('auto')}>Auto</button>
        </div>

        <div className="flip-field">
          <div className="flip-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="flip-input-row">
            <div className={`flip-input-wrap ${status === 'flipping' || isAutoBetting ? 'disabled' : ''}`}>
              <span className="flip-cur">Ł</span>
              <input
                type="number" className="flip-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'flipping' || isAutoBetting} min="0" step="1"
              />
            </div>
            <button className="flip-sm-btn" onClick={halfBet} disabled={status === 'flipping' || isAutoBetting}>½</button>
            <button className="flip-sm-btn" onClick={doubleBet} disabled={status === 'flipping' || isAutoBetting}>2×</button>
          </div>
        </div>

        {mode === 'manual' ? (
          <>
            <div className="flip-side-selector">
              <button className={`side-btn ${manualSide === 'heads' ? 'active' : ''}`} onClick={() => setManualSide('heads')} disabled={status === 'flipping'}>
                <div className="mini-coin heads"><div className="mini-inner-circle"></div></div>
                <span>Heads</span>
              </button>
              <button className={`side-btn ${manualSide === 'tails' ? 'active' : ''}`} onClick={() => setManualSide('tails')} disabled={status === 'flipping'}>
                <div className="mini-coin tails"><div className="mini-inner-diamond"></div></div>
                <span>Tails</span>
              </button>
            </div>
            
            <button className="flip-random-btn" onClick={handleRandomPick} disabled={status === 'flipping'}>
              Random Pick
            </button>

            <button className="flip-bet-btn" onClick={startGame} disabled={parseFloat(betAmount) < 0 || status === 'flipping'}>
              {status === 'flipping' ? 'Flipping...' : 'Bet'}
            </button>

            <div className="flip-field" style={{ marginTop: '12px' }}>
              <div className="flip-field-label">
                <span>Total Profit ({getMultiplier(1).toFixed(2)}×)</span>
                <span>$0.00</span>
              </div>
              <div className="flip-input-wrap disabled">
                <input type="text" className="flip-input" value={profit > 0 ? profit : '0'} readOnly />
                <span className="flip-cur">Ł</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flip-field">
              <div className="flip-field-label">Flips</div>
              <select className="flip-select" value={numFlips} onChange={e => handleNumFlipsChange(Number(e.target.value))} disabled={status === 'flipping' || isAutoBetting}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flip-field">
              <div className="flip-field-label">Number of Bets</div>
              <div className={`flip-input-wrap ${status === 'flipping' || isAutoBetting ? 'disabled' : ''}`}>
                <input type="number" className="flip-input" value={numBets} onChange={e => setNumBets(Number(e.target.value))} disabled={status === 'flipping' || isAutoBetting} min="0" />
                <span className="flip-cur">∞</span>
              </div>
            </div>

            <button className="flip-random-btn" onClick={handleRandomPick} disabled={status === 'flipping' || isAutoBetting} style={{ marginTop: '12px' }}>
              Random Pick
            </button>

            {isAutoBetting ? (
              <button className="flip-bet-btn stop" onClick={() => setIsAutoBetting(false)}>
                Stop Autobet
              </button>
            ) : (
              <button className="flip-bet-btn blue" onClick={startAutoBet} disabled={parseFloat(betAmount) < 0}>
                Start Autobet
              </button>
            )}
          </>
        )}
      </div>

      <div className="flip-game-area">
        {lastWin !== null && status === 'idle' && (
          <div className={`flip-overlay-result ${lastWin ? 'won' : 'lost'}`}>
            {lastWin ? `+${profit} Ł` : `-${parseFloat(betAmount).toFixed(2)} Ł`}
          </div>
        )}

        <div className="flip-board">
          {mode === 'manual' ? (
            <Coin 
              predicted={manualSide} 
              outcome={status === 'flipping' || lastWin !== null ? outcomes[0] : null} 
              flipCount={flipTrigger} 
              size="large" 
            />
          ) : (
            <div className="auto-coin-grid" style={{ maxWidth: numFlips > 5 ? '600px' : '400px' }}>
              {autoSequence.map((side, i) => (
                <Coin 
                  key={i} 
                  index={i} 
                  predicted={side} 
                  outcome={status === 'flipping' || lastWin !== null ? outcomes[i] : null} 
                  flipCount={flipTrigger} 
                  size="small" 
                  interactive={status === 'idle' && !isAutoBetting} 
                  onClick={() => {
                    const newSeq = [...autoSequence];
                    newSeq[i] = side === 'heads' ? 'tails' : 'heads';
                    setAutoSequence(newSeq);
                    setLastWin(null);
                    setOutcomes([]);
                  }} 
                />
              ))}
            </div>
          )}
        </div>

        {mode === 'auto' && (
          <div className="auto-stats-bar">
            <div className="flip-field">
              <div className="flip-field-label">Profit on Win ({getMultiplier(numFlips).toFixed(2)}×)</div>
              <div className="flip-input-wrap disabled">
                <input type="text" className="flip-input" value={betAmount ? (parseFloat(betAmount) * getMultiplier(numFlips)).toFixed(2) : '0'} readOnly />
                <span className="flip-cur">Ł</span>
              </div>
            </div>
            <div className="flip-field">
              <div className="flip-field-label">Win Chance</div>
              <div className="flip-input-wrap disabled">
                <input type="text" className="flip-input" value={((1 / Math.pow(2, numFlips)) * 100).toFixed(4)} readOnly />
                <span className="flip-cur">%</span>
              </div>
            </div>
          </div>
        )}

        {mode === 'manual' && (
          <div className="flip-history-track">
            <div className="history-label">History</div>
            <div className="history-items">
              {history.length === 0 ? (
                <div className="history-empty">No flips yet</div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className={`hist-item ${h === 'heads' ? 'hist-heads' : 'hist-tails'}`}></div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
