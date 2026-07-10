import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './plinko.css';

const PAYOUT_TABLES = {
  8: {
    Low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    Medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    High:   [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    Low:    [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
    Medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    High:   [170, 24, 8, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8, 24, 170],
  },
  16: {
    Low:    [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    Medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    High:   [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

function slotBg(mult) {
  if (mult >= 100)  return '#c2185b';
  if (mult >= 26)   return '#9c27b0';
  if (mult >= 9)    return '#673ab7';
  if (mult >= 4)    return '#3f51b5';
  if (mult >= 2)    return '#1565c0';
  if (mult >= 1)    return '#0d47a1';
  return '#162533';
}

function fmtMult(m) {
  if (m >= 1000) return '1K';
  if (m >= 100)  return m.toFixed(0);
  if (Number.isInteger(m)) return m.toFixed(1);
  return m.toFixed(1);
}

function geom(rows) {
  const W = 680, H = 510;
  const PS  = (W - 60) / (rows + 1);          // peg spacing
  const RS  = (H - 95) / rows;                 // row spacing
  const TOP = 18;
  const PR  = rows === 16 ? 3.5 : rows === 12 ? 4.5 : 5.5;   // peg radius
  const BR  = rows === 16 ? 6.5 : rows === 12 ? 7.5 : 8.5;   // ball radius
  const CX  = W / 2;
  // Row r (0-indexed 0..rows-1) has r+2 pegs at j=0..r+1
  const px  = (r, j) => CX + (j - (r + 1) / 2) * PS;        // peg x
  const py  = (r)    => TOP + r * RS;                          // peg y
  const sx  = (j)    => CX + (j - rows / 2) * PS;             // slot x
  const sy  = TOP + rows * RS + 14;                            // slot y
  return { W, H, PS, RS, TOP, PR, BR, CX, px, py, sx, sy };
}

export default function PlinkoGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  const [difficulty, setDifficulty] = useState('High');
  const [numRows, setNumRows] = useState(16);
  const [betting, setBetting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Auto bet state
  const [numBets, setNumBets] = useState('0');
  const [autobetting, setAutobetting] = useState(false);

  const canvasRef   = useRef(null);
  const animRef     = useRef(null);
  const ballsRef    = useRef([]);
  const lastResRef  = useRef(null);
  const settingsRef = useRef({ numRows: 16, difficulty: 'High' });
  const autobetRef  = useRef(false);
  const autoIntervalRef = useRef(null);
  const betsRemRef  = useRef(0);

  // --- Draw ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    if (canvas.width !== 680 * dpr) {
      canvas.width = 680 * dpr;
      canvas.height = 510 * dpr;
    }

    const { numRows: rows, difficulty: diff } = settingsRef.current;
    const payouts = PAYOUT_TABLES[rows][diff];
    const { W, H, PS, PR, BR, px, py, sx, sy } = geom(rows);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Pegs
    for (let r = 0; r < rows; r++) {
      for (let j = 0; j <= r + 1; j++) {
        ctx.beginPath();
        ctx.arc(px(r, j), py(r), PR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 191, 215, 0.88)';
        ctx.fill();
      }
    }

    // Slots
    const SW = PS - 4;
    const SH = 22;
    const lastIdx = lastResRef.current?.slotIndex;

    for (let j = 0; j <= rows; j++) {
      const x = sx(j), y = sy;
      const mult = payouts[j];
      const isLit = lastIdx === j;
      const bg = slotBg(mult);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x - SW / 2, y - SH / 2, SW, SH, 4);
      ctx.fillStyle = isLit ? bg : bg + 'bb';
      ctx.fill();
      if (isLit) {
        ctx.shadowColor = bg;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${rows === 16 ? 8 : 10}px Inter,Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fmtMult(mult), x, y);
      ctx.restore();
    }

    // Balls
    for (const b of ballsRef.current) {
      ctx.save();
      const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BR);
      g.addColorStop(0, '#f48fb1');
      g.addColorStop(1, '#9c27b0');
      ctx.beginPath();
      ctx.arc(b.x, b.y, BR, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.shadowColor = '#ce93d8';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }
    
    ctx.restore(); // restore dpr scale
  }, []);

  // Sync settings ref and redraw on settings change
  useEffect(() => {
    settingsRef.current = { numRows, difficulty, _betAmount: betAmount };
    lastResRef.current  = null;
    draw();
  }, [numRows, difficulty, betAmount, draw]);

  // Redraw when lastResult changes (slot highlight)
  useEffect(() => {
    lastResRef.current = lastResult;
    draw();
  }, [lastResult, draw]);

  // --- Drop ball ---
  const dropBall = useCallback(() => {
    const rows = settingsRef.current.numRows;
    const diff = settingsRef.current.difficulty;
    const payouts = PAYOUT_TABLES[rows][diff];
    const { CX, PS, RS, TOP, BR, px: _px, py: _py, sx: _sx, sy: _sy } = geom(rows);

    // Generate path
    const path = Array.from({ length: rows }, () => Math.random() < 0.5 ? 'R' : 'L');
    let rights = 0;
    for (const d of path) if (d === 'R') rights++;
    const slotIndex = rights;
    const mult = payouts[slotIndex];

    // Build waypoints: ball passes through each peg it touches
    const waypoints = [{ x: CX, y: TOP - BR - 8 }]; // start above board
    let cumRights = 0;
    for (let r = 0; r < rows; r++) {
      if (path[r] === 'R') cumRights++;
      waypoints.push({
        x: CX + (cumRights - (r + 1) / 2) * PS,
        y: TOP + r * RS,
      });
    }
    waypoints.push({ x: _sx(slotIndex), y: _sy - BR });

    // Animate
    const FPS = rows === 16 ? 7 : rows === 12 ? 8 : 10;
    let step = 0, frame = 0;
    const ball = { x: waypoints[0].x, y: waypoints[0].y };
    ballsRef.current.push(ball);

    const animate = () => {
      frame++;
      if (frame >= FPS) { frame = 0; step++; }
      if (step >= waypoints.length - 1) {
        ballsRef.current = ballsRef.current.filter(b => b !== ball);
        setLastResult({ slotIndex, multiplier: mult });
        // Submit bet to backend when ball lands
        const betAmt = parseFloat(settingsRef.current._betAmount || '0');
        if (betAmt > 0) {
          api.post('/games/plinko/bet', {
            amount: betAmt,
            risk: settingsRef.current.difficulty.toLowerCase(),
            rows: settingsRef.current.numRows,
          }).then(() => fetchBalance()).catch(() => {});
        }
        if (!autobetRef.current && ballsRef.current.length === 0) {
          setBetting(false);
        }
        draw();
        return;
      }
      const t = frame / FPS;
      const ease = t * t * (3 - 2 * t);
      const from = waypoints[step], to = waypoints[step + 1];
      ball.x = from.x + (to.x - from.x) * ease;
      ball.y = from.y + (to.y - from.y) * ease;
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, [draw]);

  const handleBet = () => {
    if (parseFloat(betAmount) < 0 || betting) return;
    setLastResult(null);
    lastResRef.current = null;
    setBetting(true);
    dropBall();
  };

  const startAutobet = () => {
    if (parseFloat(betAmount) < 0) return;
    setAutobetting(true);
    autobetRef.current = true;
    setBetting(true);
    setLastResult(null);
    lastResRef.current = null;
    let rem = parseInt(numBets, 10);
    if (isNaN(rem) || rem < 0) rem = 0;
    betsRemRef.current = rem;

    // Drop first ball immediately
    dropBall();
    if (betsRemRef.current > 0) betsRemRef.current--;

    if (betsRemRef.current === 0 && rem !== 0) {
      stopAutobet();
      return;
    }

    autoIntervalRef.current = setInterval(() => {
      dropBall();
      if (betsRemRef.current > 0) {
        betsRemRef.current--;
      }
      if (betsRemRef.current === 0 && rem !== 0) {
        stopAutobet();
      }
    }, 250);
  };

  const stopAutobet = () => {
    setAutobetting(false);
    autobetRef.current = false;
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    if (ballsRef.current.length === 0) {
      setBetting(false);
    }
  };

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
  }, []);

  const halfBet   = () => { if (betAmount) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount) setBetAmount((Number(betAmount) * 2).toString()); };

  return (
    <div className="plinko-page">
      {/* Left Panel */}
      <div className="plinko-panel">
        <div className="plinko-mode-tabs">
          {['Manual', 'Auto'].map(m => (
            <button key={m} className={`plinko-mode-tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>

        <div className="plinko-field">
          <div className="plinko-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="plinko-input-row">
            <div className="plinko-input-wrap">
              <span className="plinko-cur">Ł</span>
              <input
                type="number" className="plinko-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || betting} min="0" step="1"
              />
            </div>
            <button className="plinko-sm-btn" onClick={halfBet}   disabled={betting}>½</button>
            <button className="plinko-sm-btn" onClick={doubleBet} disabled={betting}>2×</button>
          </div>
        </div>

        <div className="plinko-field">
          <label className="plinko-field-label">Difficulty</label>
          <select className="plinko-select" value={difficulty}
            onChange={e => { setDifficulty(e.target.value); setLastResult(null); }}
            disabled={betting}>
            {['Low', 'Medium', 'High'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="plinko-field">
          <label className="plinko-field-label">Rows</label>
          <select className="plinko-select" value={numRows}
            onChange={e => { setNumRows(Number(e.target.value)); setLastResult(null); }}
            disabled={betting}>
            {[8, 12, 16].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {mode === 'Auto' && (
          <div className="plinko-field">
            <label className="plinko-field-label">Number of Bets</label>
            <div className="plinko-input-wrap">
              <input
                type="number" className="plinko-input" placeholder="0"
                value={numBets} onChange={e => setNumBets(e.target.value)}
                disabled={betting} min="0" step="1"
              />
              <span style={{color: '#b1bad3', fontSize: '18px', paddingLeft: '8px'}}>∞</span>
            </div>
          </div>
        )}

        {mode === 'Manual' ? (
          <button className={`plinko-bet-btn ${betting ? 'dropping' : ''}`} onClick={handleBet} disabled={betting}>
            {betting ? 'Dropping...' : 'Bet'}
          </button>
        ) : (
          <button
            className={`plinko-bet-btn ${autobetting ? 'dropping' : ''}`}
            onClick={autobetting ? stopAutobet : startAutobet}
          >
            {autobetting ? 'Stop Autobet' : 'Start Autobet'}
          </button>
        )}

        {lastResult && (
          <div className={`plinko-result ${lastResult.multiplier >= 1 ? 'won' : 'lost'}`}>
            <div className="plinko-result-mult">{fmtMult(lastResult.multiplier)}×</div>
            <div className="plinko-result-sub">
              {lastResult.multiplier >= 1
                ? `+${(parseFloat(betAmount || 0) * lastResult.multiplier).toFixed(2)} Ł`
                : `Lost ${betAmount || '0'} Ł`}
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="plinko-game-area">
        <canvas ref={canvasRef} style={{ width: 680, height: 510 }} className="plinko-canvas" />
        <div className="plinko-bottom-bar">
          <div className="plinko-bl">
            <button className="plinko-icon-btn">⚙</button>
            <button className="plinko-icon-btn">⛶</button>
            <button className="plinko-icon-btn">📊</button>
            <button className="plinko-icon-btn">↗</button>
          </div>
          <div className="plinko-brand">Kings</div>
          <div className="plinko-br">
            <button className="plinko-fair-btn">🛡 Fairness</button>
            <button className="plinko-icon-btn">🎧</button>
          </div>
        </div>
      </div>
    </div>
  );
}
