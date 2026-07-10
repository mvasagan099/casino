import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './diamonds.css';

const DIAMOND_COLORS = [
  'purple', 'blue', 'yellow', 'red', 'cyan', 'green', 'orange'
];

const PAYOUTS = [
  { id: '5_kind', name: 'Five of a Kind', mult: 50.00, chance: 0.04 },
  { id: '4_kind', name: 'Four of a Kind', mult: 5.00, chance: 1.25 },
  { id: 'full_house', name: 'Full House', mult: 4.00, chance: 1.25 },
  { id: '3_kind', name: 'Three of a Kind', mult: 3.00, chance: 10.00 },
  { id: '2_pair', name: 'Two Pair', mult: 2.00, chance: 22.50 },
  { id: '1_pair', name: 'One Pair', mult: 0.10, chance: 49.98 },
  { id: 'no_match', name: 'No Match', mult: 0.00, chance: 14.98 }
];

const getHandDetails = (diamonds) => {
  const counts = {};
  diamonds.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
  const freqs = Object.values(counts).sort((a, b) => b - a);

  if (freqs[0] === 5) return PAYOUTS.find(p => p.id === '5_kind');
  if (freqs[0] === 4) return PAYOUTS.find(p => p.id === '4_kind');
  if (freqs[0] === 3 && freqs[1] === 2) return PAYOUTS.find(p => p.id === 'full_house');
  if (freqs[0] === 3) return PAYOUTS.find(p => p.id === '3_kind');
  if (freqs[0] === 2 && freqs[1] === 2) return PAYOUTS.find(p => p.id === '2_pair');
  if (freqs[0] === 2) return PAYOUTS.find(p => p.id === '1_pair');
  return PAYOUTS.find(p => p.id === 'no_match');
};

export default function DiamondsGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  
  const [status, setStatus] = useState('idle'); // idle, playing, finished
  const [diamonds, setDiamonds] = useState(Array(5).fill(null));
  const [revealedCount, setRevealedCount] = useState(0);
  const [result, setResult] = useState(null); // The matching payout object
  
  // Auto mode
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsCount, setAutoBetsCount] = useState('0');
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);
  
  const [hoveredPayout, setHoveredPayout] = useState(null);

  const halfBet = () => { if (betAmount && status !== 'playing' && !isAutoActive) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'playing' && !isAutoActive) setBetAmount((Number(betAmount) * 2).toString()); };

  const startRound = async () => {
    if (parseFloat(betAmount) < 0) return;
    setStatus('playing');
    setResult(null);
    setRevealedCount(0);
    
    try {
      const res = await api.post('/games/diamonds/bet', { amount: parseFloat(betAmount) || 0 });
      const { diamonds: newDiamonds, handId, multiplier, payout } = res.data.data;
      
      setDiamonds(newDiamonds);
      let currentReveal = 0;
      const interval = setInterval(() => {
        currentReveal++;
        setRevealedCount(currentReveal);
        if (currentReveal === 5) {
          clearInterval(interval);
          const finalResult = getHandDetails(newDiamonds);
          setResult(finalResult);
          setStatus('finished');
          fetchBalance();
        }
      }, 150);
    } catch (err) {
      console.error('Diamonds bet failed:', err);
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

  // Auto bet orchestration
  useEffect(() => {
    if (!isAutoActive || status !== 'finished') return;
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
    }, 500); // Small delay between games
    return () => clearTimeout(nextRoundTimer);
  }, [status, isAutoActive, autoBetsRemaining]);

  // Handle paytable hover state
  const activePayout = hoveredPayout || result || PAYOUTS.find(p => p.id === '1_pair');
  const displayProfit = activePayout ? (parseFloat(betAmount || 0) * activePayout.mult).toFixed(2) : '0';
  const displayChance = activePayout ? activePayout.chance : 0;

  return (
    <div className="dia-page">
      <div className="dia-panel">
        <div className="dia-mode-tabs">
          <button className={`dia-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`dia-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="dia-field">
          <div className="dia-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="dia-input-row">
            <div className="dia-input-wrap">
              <span className="dia-cur">Ł</span>
              <input
                type="number" className="dia-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'playing' || isAutoActive} min="0" step="1"
              />
            </div>
            <button className="dia-sm-btn" onClick={halfBet} disabled={status === 'playing' || isAutoActive}>½</button>
            <button className="dia-sm-btn" onClick={doubleBet} disabled={status === 'playing' || isAutoActive}>2×</button>
          </div>
        </div>

        {mode === 'Auto' && (
          <div className="dia-field">
            <label className="dia-field-label">Number of Bets</label>
            <div className="dia-input-wrap">
              <input
                type="number" className="dia-input" placeholder="0"
                value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                disabled={isAutoActive} min="0" step="1"
              />
              <span className="dia-cur" style={{fontSize: 18, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
            </div>
          </div>
        )}

        {mode === 'Auto' ? (
          <button 
            className="dia-bet-btn" 
            onClick={toggleAuto} 
            disabled={parseFloat(betAmount) < 0}
          >
            {isAutoActive ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        ) : (
          <button className="dia-bet-btn" onClick={startRound} disabled={status === 'playing' || parseFloat(betAmount) < 0}>
            Bet
          </button>
        )}
      </div>

      <div className="dia-game-area">
        <div className="dia-board-wrapper">
          
          <div className="dia-top-section">
            {/* Paytable */}
            <div className="dia-paytable">
              {PAYOUTS.map(p => (
                <div 
                  key={p.id} 
                  className={`dia-paytable-row ${(result && result.id === p.id) ? 'active' : ''}`}
                  onMouseEnter={() => setHoveredPayout(p)}
                  onMouseLeave={() => setHoveredPayout(null)}
                >
                  <div className="dia-pay-icons">
                    {/* Simplified icon logic for paytable */}
                    {p.id === '5_kind' && <span>💎💎💎💎💎</span>}
                    {p.id === '4_kind' && <span>💎💎💎💎</span>}
                    {p.id === 'full_house' && <span>💎💎💎💧💧</span>}
                    {p.id === '3_kind' && <span>💎💎💎</span>}
                    {p.id === '2_pair' && <span>💎💎💧💧</span>}
                    {p.id === '1_pair' && <span>💎💎</span>}
                    {p.id === 'no_match' && <span>-</span>}
                  </div>
                  <div className="dia-pay-mult">{p.mult.toFixed(2)}×</div>
                </div>
              ))}
            </div>

            {/* Profit & Chance Display */}
            <div className="dia-info-box">
              <div className="dia-info-group">
                <div className="info-label">Profit</div>
                <div className="info-val-wrap">
                  <span className="info-val">{displayProfit}</span>
                  <span className="dia-cur">Ł</span>
                </div>
              </div>
              <div className="dia-info-group">
                <div className="info-label">Chance</div>
                <div className="info-val-wrap">
                  <span className="info-val">{displayChance}</span>
                  <span className="dia-cur">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dia-bottom-section">
            <div className="dia-slots-container">
              {diamonds.map((color, i) => (
                <div key={i} className="dia-slot">
                  <div className="dia-pedestal"></div>
                  {i < revealedCount && color && (
                    <div className={`dia-gem color-${color}`}>
                      <div className="dia-gem-top"></div>
                      <div className="dia-gem-bottom"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="dia-bottom-bar">
          <div className="dia-bl">
            <button className="dia-icon-btn">⚙</button>
            <button className="dia-icon-btn">⛶</button>
            <button className="dia-icon-btn">📊</button>
          </div>
          <div className="dia-brand">Kings</div>
          <div className="dia-br">
            <button className="dia-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
