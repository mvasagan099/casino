import React, { useState } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './moles.css';

export default function MolesGame() {
  const { fetchBalance, balance } = useWallet();
  const [betAmount, setBetAmount] = useState('0');
  const [numMoles, setNumMoles] = useState(3);
  const [status, setStatus] = useState('idle'); // idle, playing, revealing, cashed_out, lost
  const [hits, setHits] = useState(0);
  const [molePositions, setMolePositions] = useState([]);
  const [selectedHole, setSelectedHole] = useState(null);
  const [profit, setProfit] = useState(0);
  const [currentMult, setCurrentMult] = useState(1.00);
  const [nextMult, setNextMult] = useState(1.00);

  const HOLES = [0, 1, 2, 3, 4, 5, 6];

  const handleBet = async () => {
    if (parseFloat(betAmount) < 0 || status === 'playing' || status === 'revealing') return;
    try {
      const res = await api.post('/games/moles/start', { amount: parseFloat(betAmount) || 0, numMoles });
      const { currentMult: cm, nextMult: nm } = res.data.data;
      setCurrentMult(cm);
      setNextMult(nm);
      setStatus('playing');
      setHits(0);
      setMolePositions([]);
      setSelectedHole(null);
      setProfit(0);
      fetchBalance();
    } catch (err) {
      console.error('Moles start failed:', err);
    }
  };

  const handleCashout = async () => {
    if (status !== 'playing' || hits === 0) return;
    try {
      const res = await api.post('/games/moles/cashout', {});
      const { payout } = res.data.data;
      setStatus('cashed_out');
      setProfit(payout.toFixed(2));
      fetchBalance();
    } catch (err) {
      console.error('Moles cashout failed:', err);
    }
  };

  const handleHoleClick = async (idx) => {
    if (status !== 'playing') return;
    setSelectedHole(idx);
    setStatus('revealing');
    try {
      const res = await api.post('/games/moles/pick', { holeIndex: idx });
      const { isHit, lost, molePositions: revealedPositions, hits: newHits, currentMult: cm, nextMult: nm } = res.data.data;
      
      if (revealedPositions) setMolePositions(revealedPositions);
      
      setTimeout(() => {
        if (lost) {
          setStatus('lost');
          fetchBalance();
        } else {
          setHits(newHits);
          setCurrentMult(cm);
          setNextMult(nm);
          setStatus('playing');
          setMolePositions([]);
          setSelectedHole(null);
        }
      }, 1000);
    } catch (err) {
      console.error('Moles pick failed:', err);
      setStatus('playing');
      setSelectedHole(null);
    }
  };

  const handleRandomPick = () => {
    if (status !== 'playing') return;
    const r = Math.floor(Math.random() * 7);
    handleHoleClick(r);
  };

  const renderHole = (idx) => {
    const isSelected = selectedHole === idx;
    const hasMole = molePositions.includes(idx);
    const isRevealingOrLost = status === 'revealing' || status === 'lost';
    
    let holeClass = '';
    if (isSelected && isRevealingOrLost) {
      holeClass = hasMole ? 'win' : 'lose';
    }

    return (
      <div 
        key={idx} 
        className={`mole-hole-container ${holeClass} ${status !== 'playing' ? 'disabled' : ''}`}
        onClick={() => handleHoleClick(idx)}
      >
        <div className={`mole-character ${isRevealingOrLost && hasMole ? 'show' : ''}`}>
          <div className="mole-eye left"></div>
          <div className="mole-eye right"></div>
          <div className="mole-nose"></div>
          <div className="mole-tooth"></div>
        </div>

        {status === 'revealing' && isSelected && (
          <div className="mole-hammer smash">
            <div className="hammer-art">
              <div className="h-head-left"><div className="h-face"></div></div>
              <div className="h-head-right"></div>
              <div className="h-pivot"></div>
              <div className="h-handle"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const halfBet = () => { if (betAmount && status !== 'playing' && status !== 'revealing') setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'playing' && status !== 'revealing') setBetAmount((Number(betAmount) * 2).toString()); };

  const canBet = status === 'idle' || status === 'cashed_out' || status === 'lost';

  return (
    <div className="moles-page">
      <div className="moles-panel">
        <div className="moles-field">
          <div className="moles-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="moles-input-row">
            <div className={`moles-input-wrap ${!canBet ? 'disabled' : ''}`}>
              <span className="moles-cur">Ł</span>
              <input
                type="number" className="moles-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || !canBet} min="0" step="1"
              />
            </div>
            <button className="moles-sm-btn" onClick={halfBet} disabled={!canBet}>½</button>
            <button className="moles-sm-btn" onClick={doubleBet} disabled={!canBet}>2×</button>
          </div>
        </div>

        <div className="moles-field">
          <div className="moles-field-label">Moles</div>
          <select 
            className="moles-select" 
            value={numMoles} 
            onChange={(e) => setNumMoles(Number(e.target.value))}
            disabled={!canBet}
          >
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {status === 'playing' || status === 'revealing' ? (
          <button className="moles-bet-btn cashout" onClick={handleCashout} disabled={hits === 0 || status === 'revealing'}>
             Cashout
          </button>
        ) : (
          <button className="moles-bet-btn" onClick={handleBet} disabled={parseFloat(betAmount) < 0}>
             Bet
          </button>
        )}

        <button className="moles-random-btn" onClick={handleRandomPick} disabled={status !== 'playing'}>
          Random Pick
        </button>

        <div className="moles-field" style={{ marginTop: '12px' }}>
          <div className="moles-field-label">
            <span>Total Profit ({currentMult.toFixed(2)}×)</span>
            <span>$0.00</span>
          </div>
          <div className="moles-input-wrap disabled">
            <input 
              type="text" 
              className="moles-input" 
              value={status === 'cashed_out' ? profit : ((status === 'playing' || status === 'revealing') ? (parseFloat(betAmount) * currentMult).toFixed(2) : '0')} 
              readOnly 
            />
            <span className="moles-cur">Ł</span>
          </div>
        </div>
      </div>

      <div className="moles-game-area">
        {(status === 'cashed_out' || status === 'lost') && (
          <div className={`moles-overlay ${status === 'lost' ? 'lost' : 'won'}`}>
            <div className="overlay-mult">{currentMult.toFixed(2)}×</div>
            <div className="overlay-text">{status === 'lost' ? 'Busted' : 'You Win'}</div>
          </div>
        )}

        <div className="moles-board">
          <div className="moles-row">
            {HOLES.slice(0, 2).map(renderHole)}
          </div>
          <div className="moles-row">
            {HOLES.slice(2, 5).map(renderHole)}
          </div>
          <div className="moles-row">
            {HOLES.slice(5, 7).map(renderHole)}
          </div>
        </div>

        <div className="moles-next-mult">
          → {nextMult.toFixed(2)}×
        </div>
      </div>
    </div>
  );
}
