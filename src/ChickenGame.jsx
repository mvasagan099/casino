import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './chicken.css';

const MULTIPLIERS = {
  Easy: [1.04, 1.09, 1.15, 1.21, 1.27, 1.34, 1.41, 1.48, 1.56, 1.64],
  Medium: [1.15, 1.37, 1.64, 2.00, 2.46, 3.03, 3.73, 4.60, 5.67, 7.00],
  Hard: [1.40, 1.98, 2.83, 4.04, 5.77, 8.25, 11.78, 16.83, 24.05, 34.35],
  'Extra Hard': [1.96, 3.84, 7.53, 14.76, 28.93, 56.70, 111.14, 217.83, 426.95, 836.83]
};

const SUCCESS_PROB = {
  Easy: 0.95,
  Medium: 0.85,
  Hard: 0.70,
  'Extra Hard': 0.50
};

export default function ChickenGame() {
  const { fetchBalance, balance } = useWallet();
  const [betAmount, setBetAmount] = useState('0');
  const [difficulty, setDifficulty] = useState('Medium');
  const [status, setStatus] = useState('idle'); // idle, playing, crashed, cashed_out, crossing
  const [lane, setLane] = useState(0); // 0 is start, 1-10 are road lanes
  const [history, setHistory] = useState([]);
  const [carAnim, setCarAnim] = useState(null); // { lane, top }
  const [shake, setShake] = useState(false);

  const multipliers = MULTIPLIERS[difficulty];
  const currentMult = lane === 0 ? 1.00 : multipliers[lane - 1];

  const handleBet = async () => {
    if (parseFloat(betAmount) < 0 || status === 'playing' || status === 'crossing') return;
    try {
      await api.post('/games/chicken/start', { amount: parseFloat(betAmount) || 0, difficulty });
      setStatus('playing');
      setLane(0);
      setCarAnim(null);
      fetchBalance();
    } catch (err) {
      console.error('Chicken start failed:', err);
    }
  };

  const nextJump = async () => {
    if (status !== 'playing') return;
    setStatus('crossing');
    const nextLane = lane + 1;
    setLane(nextLane);
    try {
      const res = await api.post('/games/chicken/jump', {});
      const { survived, crashed, lane: newLane, currentMult, cashedOut, payout } = res.data.data;
      if (crashed) {
        setTimeout(() => { setCarAnim(nextLane); }, 80);
        setTimeout(() => { setShake(true); setTimeout(() => setShake(false), 400); }, 180);
        setTimeout(() => {
          setStatus('crashed');
          setHistory(prev => [{ mult: 0, profit: 0, win: false }, ...prev].slice(0, 10));
          fetchBalance();
        }, 350);
      } else if (cashedOut) {
        setTimeout(() => {
          setStatus('cashed_out');
          const profit = payout - parseFloat(betAmount);
          setHistory(prev => [{ mult: currentMult, profit, win: true }, ...prev].slice(0, 10));
          fetchBalance();
        }, 400);
      } else {
        setTimeout(() => { setStatus('playing'); }, 400);
      }
    } catch (err) {
      console.error('Chicken jump failed:', err);
      setStatus('playing');
    }
  };

  const handleCashout = async (forcedLane = null) => {
    const activeLane = forcedLane !== null ? forcedLane : lane;
    if (activeLane === 0 || status === 'crashed') return;
    try {
      const res = await api.post('/games/chicken/cashout', {});
      const { payout, multiplier } = res.data.data;
      setStatus('cashed_out');
      const profit = payout - parseFloat(betAmount);
      setHistory(prev => [{ mult: multiplier, profit, win: true }, ...prev].slice(0, 10));
      fetchBalance();
    } catch (err) {
      console.error('Chicken cashout failed:', err);
    }
  };

  useEffect(() => {
    if (status === 'crashed') {
      // history already updated inline above
    }
  }, [status]);

  const halfBet = () => { if (betAmount && status !== 'playing' && status !== 'crossing') setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'playing' && status !== 'crossing') setBetAmount((Number(betAmount) * 2).toString()); };

  const profitOnWin = lane > 0 ? (parseFloat(betAmount) * currentMult).toFixed(2) : '0';

  return (
    <div className="chicken-page">
      <div className="chicken-panel">
        <div className="chicken-mode-tabs">
          <button className="chicken-mode-tab active">Manual</button>
          <button className="chicken-mode-tab">Auto</button>
        </div>

        <div className="chicken-field">
          <div className="chicken-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="chicken-input-row">
            <div className="chicken-input-wrap">
              <span className="chicken-cur">Ł</span>
              <input
                type="number" className="chicken-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'playing' || status === 'crossing'} min="0" step="1"
              />
            </div>
            <button className="chicken-sm-btn" onClick={halfBet} disabled={status === 'playing' || status === 'crossing'}>½</button>
            <button className="chicken-sm-btn" onClick={doubleBet} disabled={status === 'playing' || status === 'crossing'}>2×</button>
          </div>
        </div>

        <div className="chicken-field">
          <label className="chicken-field-label">Difficulty</label>
          <select 
            className="chicken-select" 
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            disabled={status === 'playing' || status === 'crossing'}
          >
            {Object.keys(MULTIPLIERS).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {status === 'playing' || status === 'crossing' ? (
          <>
            <button className={`chicken-bet-btn cashout ${status === 'crossing' ? 'disabled' : ''}`} onClick={() => handleCashout()} disabled={status === 'crossing' || lane === 0}>
              Cashout
            </button>
            <button className={`chicken-sec-btn jump ${status === 'crossing' ? 'disabled' : ''}`} onClick={nextJump} disabled={status === 'crossing'}>
              {lane === 0 ? 'Go' : 'Jump'}
            </button>
          </>
        ) : (
          <button className="chicken-bet-btn" onClick={handleBet} disabled={parseFloat(betAmount) < 0}>
            Bet
          </button>
        )}

        <div className="chicken-field" style={{ marginTop: '12px' }}>
          <div className="chicken-field-label">
            <span>Total Profit ({currentMult.toFixed(2)}×)</span>
            <span>$0.00</span>
          </div>
          <div className="chicken-input-wrap disabled">
            <input type="text" className="chicken-input" value={profitOnWin} readOnly />
            <span className="chicken-cur">Ł</span>
          </div>
        </div>
      </div>

      <div className="chicken-game-area">
        <div className="chicken-board-wrapper">
          <div className={`chicken-board ${shake ? 'shake' : ''}`}>

            <div className="chicken-sidewalk left">
              <div className="css-traffic-light" style={{ marginTop: '30px', marginBottom: 'auto' }}>
                <div className="light yellow"></div>
                <div className="light"></div>
              </div>
              
              {/* Chicken Character (Wrapper handles horizontal slide, child handles vertical hop) */}
              <div 
                className="chicken-avatar-container"
                style={{ 
                  transform: `translateX(${lane * 64}px)`,
                  transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
                }}
              >
                <div className={`chicken-avatar-sprite ${status === 'crossing' ? 'jumping' : ''} ${status === 'crashed' ? 'dead' : ''}`}>
                  <div className="css-chicken">
                    <div className="css-chicken-comb"></div>
                    <div className="css-chicken-tail"></div>
                    <div className="css-chicken-body">
                      <div className="css-chicken-wing"></div>
                    </div>
                    <div className="css-chicken-head">
                      <div className="css-chicken-eye"></div>
                      <div className="css-chicken-beak"></div>
                      <div className="css-chicken-wattle"></div>
                    </div>
                    <div className="css-chicken-leg left"></div>
                    <div className="css-chicken-leg right"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 10 Lanes */}
            <div className="chicken-lanes">
              {multipliers.map((mult, i) => (
                <div key={i} className={`chicken-lane ${lane === i + 1 ? 'active' : ''} ${status === 'crashed' && lane === i + 1 ? 'crash' : ''}`}>
                  <div className="lane-stripes"></div>
                  
                  {/* Car Animation on Crash */}
                  {carAnim === i + 1 && (
                    <div className="chicken-car-anim" style={{ zIndex: 15 }}>
                      <div className={`css-car ${i % 2 === 0 ? 'police' : 'red'}`}>
                        {i % 2 === 0 && <div className="lightbar"></div>}
                        <div className="css-car-windshield"></div>
                        <div className="css-car-headlights"></div>
                        <div className="css-car-broken-barricade"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Passed Cars & Barriers (shown on current and past lanes) */}
                  {lane >= i + 1 && status !== 'idle' && (
                    <div style={{ position: 'absolute', bottom: '150px', zIndex: 5 }}>
                      {i % 3 === 0 ? (
                        <div className="css-car police">
                          <div className="lightbar"></div>
                          <div className="css-car-windshield"></div>
                          <div className="css-car-headlights"></div>
                          <div className="css-car-broken-barricade"></div>
                        </div>
                      ) : i % 3 === 1 ? (
                        <div className="css-car red">
                          <div className="css-car-windshield"></div>
                          <div className="css-car-headlights"></div>
                          <div className="css-car-broken-barricade"></div>
                        </div>
                      ) : (
                        <div className="css-barrier">
                          <div className="css-barrier-beam"></div>
                          <div className="css-barrier-leg"></div>
                          <div className="css-barrier-leg"></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manhole */}
                  <div className={`chicken-manhole ${lane >= i + 1 ? 'kings-logo' : ''}`}></div>

                  <div className={`chicken-mult-badge ${lane === i + 1 && status !== 'crashed' ? 'active-mult' : ''} ${lane > i + 1 ? 'passed' : ''} ${status === 'crashed' && lane === i + 1 ? 'fail' : ''}`}>
                    {mult.toFixed(2)}×
                  </div>
                </div>
              ))}
            </div>
            
            {/* End Sidewalk */}
            <div className="chicken-sidewalk right">
               <div className="chicken-bush">🌳</div>
            </div>

            {/* Result Overlay */}
            {(status === 'crashed' || status === 'cashed_out') && (
              <div className={`chicken-result-overlay ${status}`}>
                {status === 'crashed' ? (
                  <div className="result-text fail">0.00×</div>
                ) : (
                  <div className="result-text win">
                    <div className="mult-text">{currentMult.toFixed(2)}×</div>
                    <div className="profit-text">+{profitOnWin} Ł</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="chicken-bottom-bar">
          <div className="chicken-bl">
            <button className="chicken-icon-btn">⚙</button>
            <button className="chicken-icon-btn">⛶</button>
            <button className="chicken-icon-btn">📊</button>
          </div>
          <div className="chicken-brand">Kings</div>
          <div className="chicken-br">
            <button className="chicken-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
