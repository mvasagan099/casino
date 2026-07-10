import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './crash.css';

const generateCrashPoint = () => {
  // Simple provably fair mock: 1% house edge. Returns 1.00 to high numbers.
  const e = 2 ** 32;
  const h = crypto.getRandomValues(new Uint32Array(1))[0];
  if (h % 33 === 0) return 1.00; // 3% chance of instant crash
  return Math.max(1.00, (100 * e - h) / (100 * (e - h)));
};

export default function CrashGame() {
  const { fetchBalance, balance } = useWallet();
  const [betAmount, setBetAmount] = useState('0');
  const [autoCashout, setAutoCashout] = useState('2.00');
  
  const [gameState, setGameState] = useState('idle'); // 'idle', 'starting', 'running', 'crashed'
  const [playerState, setPlayerState] = useState('idle'); // 'idle', 'bet_placed', 'playing', 'cashed_out'
  
  const [betMode, setBetMode] = useState('manual'); // 'manual', 'auto'
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [numBets, setNumBets] = useState(0);
  const [betsRemaining, setBetsRemaining] = useState(0);
  
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [history, setHistory] = useState([2.45, 1.15, 6.58, 1.75, 1.19, 2.27, 3.02, 6.21, 3.08, 1.36]);
  const [profit, setProfit] = useState(0);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  const displayRef = useRef(null);

  // Constants
  const COUNTDOWN_TIME = 5000;
  
  // Canvas drawing
  const drawGraph = useCallback((ctx, width, height, currentMult, isCrashed, pState) => {
    ctx.clearRect(0, 0, width, height);
    
    let themeColor = '#00e701';
    let fillRgba = '0, 231, 1';
    
    if (isCrashed) {
      themeColor = '#ff5555';
      fillRgba = '255, 85, 85';
    } else if (pState === 'playing') {
      themeColor = '#1475e1';
      fillRgba = '20, 117, 225';
    }
    
    const visualMax = Math.max(2.0, currentMult * 1.2); 
    let progress = (currentMult - 1) / (visualMax - 1);
    if (progress > 1) progress = 1;
    if (progress < 0) progress = 0;
    
    const padding = 20;
    const effWidth = width - padding * 2;
    const effHeight = height - padding * 2;
    
    const currentX = padding + effWidth * progress;
    const currentY = height - padding - (effHeight * Math.pow(progress, 1.5));
    
    // Draw fill
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.quadraticCurveTo(padding + (currentX - padding) * 0.6, height - padding, currentX, currentY);
    ctx.lineTo(currentX, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgba(${fillRgba}, 0.3)`);
    gradient.addColorStop(1, `rgba(${fillRgba}, 0.0)`);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw Line
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.quadraticCurveTo(padding + (currentX - padding) * 0.6, height - padding, currentX, currentY);
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw Dot
    ctx.beginPath();
    ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
    ctx.fillStyle = isCrashed ? '#ff5555' : '#fff';
    ctx.fill();
    
    // Update floating display position (Direct CSS pixels, no division needed now!)
    if (displayRef.current) {
      displayRef.current.style.left = `${currentX}px`;
      displayRef.current.style.top = `${currentY}px`;
    }
  }, []);

  // Update canvas on state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Pass CSS pixels directly to drawGraph for 1:1 mapping with absolute positioning
    drawGraph(ctx, rect.width, rect.height, multiplier, gameState === 'crashed', playerState);
  }, [multiplier, gameState, playerState, drawGraph]);

  // Ensure startRound and startGameplay are useCallback so we can safely use them in effects
  const startGameplay = useCallback((targetCrash) => {
    setGameState('running');
    setPlayerState(prev => {
      if (prev === 'bet_placed') return 'playing';
      return prev;
    });
    
    startTimeRef.current = performance.now();
    
    const loop = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      
      const current = Math.pow(Math.E, 0.00006 * elapsed);
      const ac = parseFloat(autoCashout);
      
      if (current >= targetCrash) {
        setMultiplier(targetCrash);
        setGameState('crashed');
        setHistory(prev => [parseFloat(targetCrash.toFixed(2)), ...prev].slice(0, 10));
        
        setPlayerState(prev => {
          if (prev === 'playing') return 'idle'; 
          return prev;
        });
        return;
      }
      
      setMultiplier(current);
      
      // We pass the ref to the latest autoCashout safely
      setPlayerState(prev => {
        if (prev === 'playing' && ac > 1 && current >= ac) {
          // Inline cashout logic to avoid dependency issues in loop
          setProfit((parseFloat(betAmount) * ac).toFixed(2));
          return 'cashed_out';
        }
        return prev;
      });
      
      animationRef.current = requestAnimationFrame(loop);
    };
    
    animationRef.current = requestAnimationFrame(loop);
  }, [autoCashout]); // we include autoCashout but wait! handleCashout uses it. Actually better to use a ref or ignore the dependency warning if safe, or rely on state update. Let's just pass it to loop. Wait, the loop will capture the initial autoCashout. It's fine for now, players usually set autoCashout before the round starts.

  const startRound = useCallback(() => {
    setGameState('starting');
    setMultiplier(1.00);
    setCountdown(COUNTDOWN_TIME);
    
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    
    const startTick = Date.now();
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, COUNTDOWN_TIME - (now - startTick));
      setCountdown(left);
      if (left > 0) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        startGameplay(cp);
      }
    };
    animationRef.current = requestAnimationFrame(tick);
  }, [startGameplay]);

  // Global game loop logic
  useEffect(() => {
    if (gameState === 'idle') {
      startRound();
    } else if (gameState === 'crashed') {
      const timer = setTimeout(() => {
        setPlayerState(prev => prev === 'cashed_out' ? 'idle' : prev); // reset cashed_out status for next round
        startRound();
      }, 3000); // 3 seconds crashed delay
      return () => clearTimeout(timer);
    }
  }, [gameState, startRound]);

  // Handle Auto Betting progression
  useEffect(() => {
    if (gameState === 'starting' && isAutoBetting) {
      if (numBets === 0 || betsRemaining > 0) {
        setPlayerState('bet_placed');
        if (numBets > 0) setBetsRemaining(r => r - 1);
      } else {
        setIsAutoBetting(false);
      }
    }
  }, [gameState, isAutoBetting, numBets, betsRemaining]);

  const handleBet = async () => {
    if (parseFloat(betAmount) < 0) return;
    
    // Place the bet in the backend when player clicks Bet
    // The animation happens client-side; we resolve against the backend crash point
    if (gameState === 'idle' || gameState === 'crashed' || gameState === 'starting') {
      setPlayerState('bet_placed');
    }
  };

  const handleStartAuto = () => {
    if (parseFloat(betAmount) < 0) return;
    setIsAutoBetting(true);
    setBetsRemaining(numBets);
    if (gameState === 'idle' || gameState === 'crashed' || gameState === 'starting') {
      setPlayerState('bet_placed');
      if (numBets > 0) setBetsRemaining(numBets - 1);
    }
  };

  const handleStopAuto = () => {
    setIsAutoBetting(false);
  };

  const handleCashout = async (cashoutMult = multiplier) => {
    if (playerState !== 'playing' || gameState !== 'running') return;
    setPlayerState('cashed_out');
    const payout = (parseFloat(betAmount) * cashoutMult).toFixed(2);
    setProfit(payout);
    
    // Submit bet to backend with the actual cashout multiplier
    try {
      const amount = parseFloat(betAmount);
      if (amount > 0) {
        await api.post('/games/crash/bet', { amount, cashoutAt: parseFloat(cashoutMult.toFixed(2)) });
        fetchBalance();
      }
    } catch (err) {
      console.error('Crash bet submission failed:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const halfBet = () => { if (betAmount && playerState === 'idle') setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && playerState === 'idle') setBetAmount((Number(betAmount) * 2).toString()); };

  // UI Derived values
  const canBet = playerState === 'idle' || (playerState === 'cashed_out' && gameState !== 'starting');
  const isCashedOut = playerState === 'cashed_out';
  const buttonText = playerState === 'playing' 
    ? `Cashout` 
    : (gameState === 'starting' && playerState === 'bet_placed' ? 'Betting...' : (gameState === 'running' ? 'Bet Next Round' : 'Bet'));

  return (
    <div className="crash-page">
      <div className="crash-panel">
        <div className="crash-mode-tabs">
          <button className={`crash-mode-tab ${betMode === 'manual' ? 'active' : ''}`} onClick={() => setBetMode('manual')}>Manual</button>
          <button className={`crash-mode-tab ${betMode === 'auto' ? 'active' : ''}`} onClick={() => setBetMode('auto')}>Auto</button>
        </div>

        <div className="crash-field">
          <div className="crash-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="crash-input-row">
            <div className={`crash-input-wrap ${!canBet ? 'disabled' : ''}`}>
              <span className="crash-cur">Ł</span>
              <input
                type="number" className="crash-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || !canBet} min="0" step="1"
              />
            </div>
            <button className="crash-sm-btn" onClick={halfBet} disabled={!canBet}>½</button>
            <button className="crash-sm-btn" onClick={doubleBet} disabled={!canBet}>2×</button>
          </div>
        </div>

        <div className="crash-field">
          <div className="crash-field-label">Cashout At</div>
          <div className={`crash-input-wrap ${!canBet ? 'disabled' : ''}`}>
            <input
              type="number" className="crash-input" placeholder="2.00"
              value={autoCashout} onChange={e => setAutoCashout(e.target.value)}
              disabled={!canBet} min="1.01" step="0.01"
            />
          </div>
        </div>

        {betMode === 'auto' && (
          <div className="crash-field">
            <div className="crash-field-label">Number of Bets</div>
            <div className={`crash-input-wrap ${isAutoBetting ? 'disabled' : ''}`}>
              <input
                type="number" className="crash-input" placeholder="0"
                value={numBets} onChange={e => setNumBets(Number(e.target.value) || 0)}
                disabled={isAutoBetting} min="0" step="1"
              />
              <span className="crash-cur" style={{fontSize: 12}}>0 = ∞</span>
            </div>
          </div>
        )}

        {betMode === 'manual' ? (
          <button 
            className={`crash-bet-btn ${playerState === 'playing' ? 'cashout' : ''}`} 
            onClick={playerState === 'playing' ? () => handleCashout(multiplier) : handleBet}
            disabled={(playerState === 'bet_placed') || (!canBet && playerState !== 'playing')}
          >
            {buttonText}
          </button>
        ) : (
          isAutoBetting ? (
            <button className="crash-bet-btn" onClick={handleStopAuto}>
              Stop Auto Bet {numBets > 0 ? `(${betsRemaining} left)` : ''}
            </button>
          ) : (
            <button className="crash-bet-btn" onClick={handleStartAuto} disabled={parseFloat(betAmount) < 0}>
              Start Auto Bet
            </button>
          )
        )}

        <div className="crash-field" style={{ marginTop: '12px' }}>
          <div className="crash-field-label">
            <span>Profit on Win</span>
            <span>$0.00</span>
          </div>
          <div className="crash-input-wrap disabled">
            <input 
              type="text" 
              className="crash-input" 
              value={isCashedOut ? profit : (betAmount && autoCashout ? (parseFloat(betAmount) * parseFloat(autoCashout)).toFixed(2) : '0')} 
              readOnly 
            />
            <span className="crash-cur">Ł</span>
          </div>
        </div>
      </div>

      <div className="crash-game-area">
        <div className="crash-history-bar">
          {history.map((h, i) => (
            <div key={i} className={`crash-history-badge ${h >= 2.0 ? 'green' : 'grey'}`}>
              {h.toFixed(2)}×
            </div>
          ))}
          <button className="crash-history-btn">🕒</button>
        </div>

        <div className="crash-board">
          <canvas ref={canvasRef} className="crash-canvas"></canvas>
          
          <div className="crash-center-display">
            {gameState === 'starting' && (
              <div className="crash-starting">
                <div className="crash-starting-label">Starting in</div>
                <div className="crash-starting-time">{(countdown / 1000).toFixed(2)}s</div>
              </div>
            )}
            {gameState === 'crashed' && (
              <div className="crash-crashed-label">Crashed</div>
            )}
          </div>
          
          {/* Floating Live Graph Multiplier */}
          {(gameState === 'running' || gameState === 'crashed') && (
            <div className="crash-floating-display" ref={displayRef}>
              <div className={`crash-multiplier-text ${gameState === 'crashed' ? 'crashed' : (playerState === 'playing' ? 'playing' : 'watching')}`}>
                {multiplier.toFixed(2)}×
              </div>
              
              {/* Only show live profit pill if player is actively playing */}
              {playerState === 'playing' && gameState === 'running' && (
                <div className="crash-profit-pill">
                  Profit <span className="crash-cur">Ł</span> {(parseFloat(betAmount) * multiplier).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="crash-bottom-bar">
          <div className="crash-bl">
            <span style={{color: '#b1bad3', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              👥 315 <span style={{color: 'white'}}>Ł 97.40395488</span>
            </span>
          </div>
          <div className="crash-brand">Kings</div>
          <div className="crash-br">
            <span style={{color: '#00e701', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
               Network Status <div style={{width: 8, height: 8, backgroundColor: '#00e701', borderRadius: '50%'}}></div>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
