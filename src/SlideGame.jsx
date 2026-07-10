import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './slide.css';

const getMultiplierColorClass = (mult) => {
  if (mult < 2) return 'grey';
  if (mult < 5) return 'white';
  if (mult < 10) return 'blue';
  return 'gold';
};

const generateRandomMultiplier = () => {
  // Generates random crash-like math just for the decoys
  return Math.max(1.00, 0.98 / Math.random());
};

export default function SlideGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [targetMultiplier, setTargetMultiplier] = useState('2.00');
  
  const [status, setStatus] = useState('idle'); // idle, spinning, resolved
  const [history, setHistory] = useState([]); // past multipliers
  
  // Slide animation state
  const [cards, setCards] = useState([]);
  const [slideOffset, setSlideOffset] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState(0);
  
  const [resultMsg, setResultMsg] = useState(null); // win, lose
  
  // Fake multiplayer timer
  const [countdown, setCountdown] = useState(0);
  const [betsCount, setBetsCount] = useState(44);
  
  // Auto mode
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [autoBetsCount, setAutoBetsCount] = useState('0');
  const [autoBetsRemaining, setAutoBetsRemaining] = useState(0);
  
  const trackRef = useRef(null);

  const halfBet = () => { if (betAmount && status !== 'spinning' && !isAutoActive) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'spinning' && !isAutoActive) setBetAmount((Number(betAmount) * 2).toString()); };

  const startRound = async () => {
    if (parseFloat(betAmount) < 0 || !targetMultiplier || parseFloat(targetMultiplier) < 1.01) return;
    
    setStatus('spinning');
    setResultMsg(null);
    setTransitionDuration(0);
    setSlideOffset(0);
    
    try {
      const res = await api.post('/games/slide/bet', { amount: parseFloat(betAmount) || 0, targetMultiplier: parseFloat(targetMultiplier) });
      const { crashPoint: finalMult, won: win } = res.data.data;
      
      // Generate visual track
      const targetIndex = 40;
      const newCards = Array.from({ length: 55 }, (_, i) => {
        if (i === targetIndex) return finalMult;
        return generateRandomMultiplier();
      });
      setCards(newCards);
      
      setTimeout(() => {
        setTransitionDuration(3);
        const cardWidth = 112;
        const randomFudge = Math.floor(Math.random() * 80) - 40;
        const targetOffset = -(targetIndex * cardWidth) + randomFudge;
        setSlideOffset(targetOffset);
        
        setTimeout(() => {
          const target = parseFloat(targetMultiplier);
          const profit = win ? (parseFloat(betAmount) * target) - parseFloat(betAmount) : -parseFloat(betAmount);
          setHistory(prev => [{ mult: finalMult, win }, ...prev].slice(0, 15));
          setResultMsg({ win, profit, mult: finalMult });
          setStatus('resolved');
          setCountdown(12.2);
          setBetsCount(Math.floor(Math.random() * 100) + 20);
          fetchBalance();
        }, 3100);
      }, 50);
    } catch (err) {
      console.error('Slide bet failed:', err);
      setStatus('idle');
      if (isAutoActive) setIsAutoActive(false);
    }
  };

  // Countdown tick
  useEffect(() => {
    if (status !== 'resolved' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0.1) {
          // If auto is active, we let the other useEffect handle startRound
          if (!isAutoActive) {
             // For single player demo, we wait for user to click bet
             return 0;
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [status, countdown, isAutoActive]);

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
    }, 1000); // 1 sec delay between games
    return () => clearTimeout(nextRoundTimer);
  }, [status, isAutoActive, autoBetsRemaining]);

  // If no cards, populate some dummy ones just for aesthetics before first bet
  useEffect(() => {
    if (cards.length === 0) {
      setCards(Array.from({ length: 15 }, () => generateRandomMultiplier()));
    }
  }, [cards]);

  const profitOnWin = (parseFloat(betAmount) * parseFloat(targetMultiplier)).toFixed(2);

  return (
    <div className="slide-page">
      <div className="slide-panel">
        <div className="slide-mode-tabs">
          <button className={`slide-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Manual')}>Manual</button>
          <button className={`slide-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => !isAutoActive && setMode('Auto')}>Auto</button>
        </div>

        <div className="slide-field">
          <div className="slide-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="slide-input-row">
            <div className="slide-input-wrap">
              <span className="slide-cur">Ł</span>
              <input
                type="number" className="slide-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'spinning' || isAutoActive} min="0" step="1"
              />
            </div>
            <button className="slide-sm-btn" onClick={halfBet} disabled={status === 'spinning' || isAutoActive}>½</button>
            <button className="slide-sm-btn" onClick={doubleBet} disabled={status === 'spinning' || isAutoActive}>2×</button>
          </div>
        </div>
        
        <div className="slide-field">
          <label className="slide-field-label">Target Multiplier</label>
          <div className="slide-input-wrap">
            <input
              type="number" className="slide-input" placeholder="2.00"
              value={targetMultiplier} onChange={e => setTargetMultiplier(e.target.value)}
              disabled={status === 'spinning' || isAutoActive} min="1.01" step="0.01"
            />
            <span className="slide-cur">×</span>
          </div>
        </div>

        {mode === 'Auto' && (
          <div className="slide-field">
            <label className="slide-field-label">Number of Bets</label>
            <div className="slide-input-wrap">
              <input
                type="number" className="slide-input" placeholder="0"
                value={autoBetsCount} onChange={e => setAutoBetsCount(e.target.value)}
                disabled={isAutoActive} min="0" step="1"
              />
              <span className="slide-cur" style={{fontSize: 18, cursor: isAutoActive ? 'default' : 'pointer'}} onClick={() => !isAutoActive && setAutoBetsCount('0')}>∞</span>
            </div>
          </div>
        )}

        {mode === 'Auto' ? (
          <button 
            className="slide-bet-btn" 
            onClick={toggleAuto} 
            disabled={parseFloat(betAmount) < 0}
          >
            {isAutoActive ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        ) : (
          <button className="slide-bet-btn" onClick={startRound} disabled={status === 'spinning' || parseFloat(betAmount) < 0}>
            Bet
          </button>
        )}

        <div className="slide-field" style={{ marginTop: '12px' }}>
          <div className="slide-field-label">
            <span>Total Profit ({parseFloat(targetMultiplier || 1).toFixed(2)}×)</span>
            <span>$0.00</span>
          </div>
          <div className="slide-input-wrap disabled">
            <input type="text" className="slide-input" value={profitOnWin} readOnly />
            <span className="slide-cur">Ł</span>
          </div>
        </div>
      </div>

      <div className="slide-game-area">
        <div className="slide-history-track">
          {history.map((h, i) => (
            <div key={i} className={`slide-history-pill ${getMultiplierColorClass(h.mult)}`}>
              {h.mult.toFixed(2)}×
            </div>
          ))}
        </div>

        <div className="slide-board-wrapper">
          <div className="slide-machine">
            <div className="slide-pointer-container">
              <div className="slide-pointer-line"></div>
              <div className="slide-pointer-dot"></div>
            </div>
            
            <div className="slide-track-viewport">
              <div 
                className="slide-track"
                ref={trackRef}
                style={{
                  transform: `translateX(calc(50% - 50px + ${slideOffset}px))`,
                  transition: transitionDuration ? `transform ${transitionDuration}s cubic-bezier(0.1, 0.7, 0.1, 1)` : 'none'
                }}
              >
                {cards.map((mult, idx) => {
                  const isActive = status === 'resolved' && idx === 40;
                  return (
                    <div key={idx} className={`slide-card ${getMultiplierColorClass(mult)} ${isActive ? 'active' : ''}`}>
                      <div className="slide-card-val">
                        <div className="slide-hex">
                          <span>{mult.toFixed(2)}×</span>
                        </div>
                      </div>
                      <div className="slide-card-accent"></div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Result Overlay */}
            {status === 'resolved' && resultMsg && (
              <div className={`slide-result-overlay ${resultMsg.win ? 'win' : 'lose'}`}>
                {resultMsg.win ? (
                  <div className="result-text">
                    <div className="mult-text">{resultMsg.mult.toFixed(2)}×</div>
                    <div className="profit-text">+{profitOnWin} Ł</div>
                  </div>
                ) : (
                  <div className="result-text fail">{resultMsg.mult.toFixed(2)}×</div>
                )}
              </div>
            )}
          </div>
          
          {/* Progress Bar Footer */}
          <div className="slide-progress-footer">
            <div className="spf-info">
              <span className="spf-bets"><span className="dot"></span> Bets: {betsCount}</span>
              {status === 'resolved' && countdown > 0 ? (
                <span className="spf-time">Next round in: {countdown.toFixed(1)}s</span>
              ) : (
                <span className="spf-time">Wait for next round...</span>
              )}
            </div>
            <div className="spf-bar-bg">
              <div 
                className="spf-bar-fill" 
                style={{ width: status === 'resolved' && countdown > 0 ? `${(countdown / 12.2) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
          
        </div>

        <div className="slide-bottom-bar">
          <div className="slide-bl">
            <button className="slide-icon-btn">⚙</button>
            <button className="slide-icon-btn">⛶</button>
            <button className="slide-icon-btn">📊</button>
          </div>
          <div className="slide-brand">Kings</div>
          <div className="slide-br">
            <button className="slide-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
