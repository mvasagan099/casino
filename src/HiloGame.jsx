import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './hilo.css';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♣', '♦'];

const getRandomCard = () => {
  const r = Math.floor(Math.random() * 13);
  const s = Math.floor(Math.random() * 4);
  return { 
    rank: RANKS[r], 
    suit: SUITS[s], 
    value: r + 1,
    color: (SUITS[s] === '♥' || SUITS[s] === '♦') ? 'red' : 'black'
  };
};

export default function HiloGame() {
  const { fetchBalance, balance } = useWallet();
  const [betAmount, setBetAmount] = useState('0');
  const [status, setStatus] = useState('idle'); // 'idle', 'playing', 'cashed_out', 'lost'
  
  const [currentCard, setCurrentCard] = useState(getRandomCard());
  const [history, setHistory] = useState([]);
  const [multiplier, setMultiplier] = useState(1.00);
  const [profit, setProfit] = useState(0);

  const getHigherProb = (val) => (13 - val + 1) / 13;
  const getLowerProb = (val) => val / 13;
  const getHigherMult = (val) => 0.99 / getHigherProb(val);
  const getLowerMult = (val) => 0.99 / getLowerProb(val);

  const handleBet = async () => {
    const amount = parseFloat(betAmount);
    if (amount < 0 || status === 'playing') return;
    try {
      const res = await api.post('/games/hilo/start', { amount });
      if (res.data.success) {
        const { currentCard } = res.data.data;
        setCurrentCard(currentCard);
        setHistory([{ card: currentCard, mult: 1.00, label: 'Start Card' }]);
        setMultiplier(1.00);
        setStatus('playing');
        setProfit(0);
        fetchBalance();
      }
    } catch (err) {
      console.error('Hilo start failed:', err);
    }
  };

  const handleSkip = async () => {
    if (status !== 'playing') return;
    try {
      const res = await api.post('/games/hilo/guess', { direction: 'skip' });
      if (res.data.success) {
        const { nextCard } = res.data.data;
        setCurrentCard(nextCard);
        
        if (history.length === 1) {
          setHistory([{ card: nextCard, mult: 1.00, label: 'Start Card' }]);
        }
      }
    } catch (err) {
      console.error('Hilo skip failed:', err);
    }
  };

  const handleGuess = async (type) => {
    if (status !== 'playing') return;
    try {
      const res = await api.post('/games/hilo/guess', { direction: type });
      if (res.data.success) {
        const { nextCard, correct, currentMultiplier } = res.data.data;
        
        if (correct) {
          setMultiplier(currentMultiplier);
          setCurrentCard(nextCard);
          setHistory(prev => [...prev, { card: nextCard, mult: currentMultiplier, label: `${currentMultiplier.toFixed(2)}×` }]);
        } else {
          setCurrentCard(nextCard);
          setHistory(prev => [...prev, { card: nextCard, mult: 0, label: '0.00×' }]);
          setStatus('lost');
        }
      }
    } catch (err) {
      console.error('Hilo guess failed:', err);
      if (err.response?.status === 400 && err.response?.data?.error?.code === 'GAME_LOST') {
         // Optionally handle bust from error
      }
    }
  };

  const handleCashout = async () => {
    if (status !== 'playing' || history.length <= 1) return;
    try {
      const res = await api.post('/games/hilo/cashout', {});
      if (res.data.success) {
        setStatus('cashed_out');
        setProfit(res.data.data.payout.toFixed(2));
        fetchBalance();
      }
    } catch (err) {
      console.error('Hilo cashout failed:', err);
    }
  };

  const halfBet = () => { if (betAmount && status !== 'playing') setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'playing') setBetAmount((Number(betAmount) * 2).toString()); };

  const canBet = status === 'idle' || status === 'cashed_out' || status === 'lost';
  const canPlay = status === 'playing';

  const probH = getHigherProb(currentCard.value) * 100;
  const probL = getLowerProb(currentCard.value) * 100;
  const multH = getHigherMult(currentCard.value);
  const multL = getLowerMult(currentCard.value);

  return (
    <div className="hilo-page">
      {/* Left Panel */}
      <div className="hilo-panel">
        <div className="hilo-field">
          <div className="hilo-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="hilo-input-row">
            <div className={`hilo-input-wrap ${!canBet ? 'disabled' : ''}`}>
              <span className="hilo-cur">Ł</span>
              <input
                type="number" className="hilo-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || !canBet} min="0" step="1"
              />
            </div>
            <button className="hilo-sm-btn" onClick={halfBet} disabled={!canBet}>½</button>
            <button className="hilo-sm-btn" onClick={doubleBet} disabled={!canBet}>2×</button>
          </div>
        </div>

        {canPlay ? (
          <button className="hilo-bet-btn cashout" onClick={handleCashout} disabled={history.length <= 1}>
             Cashout
          </button>
        ) : (
          <button className="hilo-bet-btn" onClick={handleBet} disabled={parseFloat(betAmount) < 0}>
             Bet
          </button>
        )}

        <button className="hilo-skip-btn" onClick={handleSkip} disabled={!canPlay}>
          Skip Card <span className="skip-icon">»</span>
        </button>

        <button className="hilo-guess-btn higher" onClick={() => handleGuess('higher')} disabled={!canPlay}>
          <div className="guess-left">
            <span className="dir-icon">^</span>
            <span>Higher or Same</span>
          </div>
          <div className="guess-right">{probH.toFixed(2)}%</div>
        </button>

        <button className="hilo-guess-btn lower" onClick={() => handleGuess('lower')} disabled={!canPlay}>
          <div className="guess-left">
            <span className="dir-icon">v</span>
            <span>Lower or Same</span>
          </div>
          <div className="guess-right">{probL.toFixed(2)}%</div>
        </button>

        <div className="hilo-field" style={{ marginTop: '12px' }}>
          <div className="hilo-field-label">
            <span>Total Profit ({multiplier.toFixed(2)}×)</span>
            <span>$0.00</span>
          </div>
          <div className="hilo-input-wrap disabled">
            <input 
              type="text" 
              className="hilo-input" 
              value={status === 'cashed_out' ? profit : (canPlay ? (parseFloat(betAmount) * multiplier - parseFloat(betAmount)).toFixed(2) : '0')} 
              readOnly 
            />
            <span className="hilo-cur">Ł</span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="hilo-game-area">
        {(status === 'cashed_out' || status === 'lost') && (
          <div className={`hilo-overlay ${status === 'lost' ? 'lost' : 'won'}`}>
            <div className="overlay-mult">{multiplier.toFixed(2)}×</div>
            <div className="overlay-text">{status === 'lost' ? 'Busted' : 'You Win'}</div>
          </div>
        )}

        <div className="hilo-main-board">
          <div className="hilo-cards-container">
            <div className="hilo-ghost-card">
              <span>K</span>
              <div className="hilo-ghost-label">KING BEING<br/>THE HIGHEST</div>
            </div>

            <div className="hilo-active-card-wrap">
              <div className={`hilo-card large ${currentCard.color}`}>
                <div className="hilo-card-tl">
                  <div>{currentCard.rank}</div>
                  <div className="small-suit">{currentCard.suit}</div>
                </div>
                <div className="hilo-card-center">{currentCard.suit}</div>
              </div>
              {canPlay && <div className="hilo-skip-badge" onClick={handleSkip}>»</div>}
            </div>

            <div className="hilo-ghost-card">
              <span>A</span>
              <div className="hilo-ghost-label">ACE BEING<br/>THE LOWEST</div>
            </div>
          </div>
        </div>

        <div className="hilo-profit-indicators">
          <div className="hilo-profit-box">
            <div className="profit-box-label">Profit Higher ({multH.toFixed(2)}×)</div>
            <div className="profit-box-val">
              <span>{canPlay ? (parseFloat(betAmount) * multiplier * multH - parseFloat(betAmount)).toFixed(2) : '0'}</span>
              <span className="hilo-cur-sm">Ł</span>
            </div>
          </div>
          <div className="hilo-profit-box">
            <div className="profit-box-label">Profit Lower ({multL.toFixed(2)}×)</div>
            <div className="profit-box-val">
              <span>{canPlay ? (parseFloat(betAmount) * multiplier * multL - parseFloat(betAmount)).toFixed(2) : '0'}</span>
              <span className="hilo-cur-sm">Ł</span>
            </div>
          </div>
        </div>

        <div className="hilo-history-track">
          {history.length === 0 ? (
            <div className="hilo-history-empty">Place a bet to start tracking cards</div>
          ) : (
            history.map((h, i) => (
              <div key={i} className="hilo-history-item">
                <div className={`hilo-card hilo-hist-card ${h.card.color}`}>
                  <div className="hilo-card-tl">
                    <div>{h.card.rank}</div>
                    <div className="small-suit">{h.card.suit}</div>
                  </div>
                </div>
                <div className={`hilo-hist-mult ${h.mult === 0 ? 'fail' : (h.label === 'Start Card' ? 'start' : 'success')}`}>
                  {h.label}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
