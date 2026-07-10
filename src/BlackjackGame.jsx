import React, { useState, useCallback } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './blackjack.css';

// --- Deck ---
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffle(deck);
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function handTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBust(hand) { return handTotal(hand) > 21; }
function isBlackjack(hand) { return hand.length === 2 && handTotal(hand) === 21; }
function isRedSuit(suit) { return suit === '♥' || suit === '♦'; }

// --- Card Component ---
function PlayingCard({ card, faceDown = false, small = false }) {
  if (faceDown) {
    return (
      <div className={`bj-card bj-card-back ${small ? 'small' : ''}`}>
        <div className="bj-card-back-pattern"></div>
      </div>
    );
  }
  const red = isRedSuit(card.suit);
  return (
    <div className={`bj-card ${red ? 'red' : 'black'} ${small ? 'small' : ''}`}>
      <div className="bj-card-corner top-left">
        <div className="bj-rank">{card.rank}</div>
        <div className="bj-suit">{card.suit}</div>
      </div>
      <div className="bj-card-center">{card.suit}</div>
      <div className="bj-card-corner bottom-right">
        <div className="bj-rank">{card.rank}</div>
        <div className="bj-suit">{card.suit}</div>
      </div>
    </div>
  );
}

// --- Hand Display ---
function HandDisplay({ hand, hideSecond = false, label, total, showTotal = true }) {
  return (
    <div className="bj-hand-area">
      {showTotal && hand.length > 0 && (
        <div className="bj-hand-total">{hideSecond ? '?' : total}</div>
      )}
      <div className="bj-cards-row">
        {hand.map((card, i) => (
          <PlayingCard
            key={i}
            card={card}
            faceDown={hideSecond && i === 1}
          />
        ))}
      </div>
      {label && <div className="bj-hand-label">{label}</div>}
    </div>
  );
}

// --- Main Game ---
export default function BlackjackGame() {
  const { fetchBalance, balance } = useWallet();
  const [betAmount, setBetAmount] = useState('0');
  const [gameState, setGameState] = useState('idle'); // idle | playing | dealer | done
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [dealerVisible, setDealerVisible] = useState([]);
  const [result, setResult] = useState(null);
  const [resultMsg, setResultMsg] = useState('');
  const [payout, setPayout] = useState(0);

  const mapStatus = (status) => {
    if (status === 'win' || status === 'blackjack') return 'win';
    if (status === 'push') return 'push';
    return 'lose';
  };

  const resolveGame = useCallback((pHand, dHand) => {
    const pTotal = handTotal(pHand);
    const dTotal = handTotal(dHand);
    const pBJ = isBlackjack(pHand);
    const dBJ = isBlackjack(dHand);
    const pBust = isBust(pHand);
    const dBust = isBust(dHand);

    if (pBust) {
      setResult('lose'); setResultMsg('Bust! You lose.');
    } else if (dBust) {
      setResult('win'); setResultMsg('Dealer busts! You win!');
    } else if (pBJ && !dBJ) {
      setResult('blackjack'); setResultMsg('Blackjack! You win 3:2!');
    } else if (dBJ && !pBJ) {
      setResult('lose'); setResultMsg('Dealer Blackjack. You lose.');
    } else if (pTotal > dTotal) {
      setResult('win'); setResultMsg(`You win! ${pTotal} vs ${dTotal}`);
    } else if (dTotal > pTotal) {
      setResult('lose'); setResultMsg(`Dealer wins. ${dTotal} vs ${pTotal}`);
    } else {
      setResult('push'); setResultMsg(`Push! ${pTotal} vs ${dTotal}`);
    }
    setGameState('done');
  }, []);

  const dealerPlay = useCallback((currentDeck, pHand, dHand) => {
    let d = [...dHand];
    let remaining = [...currentDeck];

    while (handTotal(d) < 17) {
      const { card, remaining: rest } = dealCard(remaining);
      d.push(card);
      remaining = rest;
    }

    setDealerHand(d);
    setDeck(remaining);
    resolveGame(pHand, d);
  }, [resolveGame]);

  const handleBet = async () => {
    if (parseFloat(betAmount) < 0) return;
    try {
      const res = await api.post('/games/blackjack/start', { amount: parseFloat(betAmount) || 0 });
      const { playerHand: ph, dealerHand: dh, dealerVisible: dv, status, payout: p, playerTotal, dealerTotal } = res.data.data;
      setPlayerHand(ph);
      setDealerHand(dh || []);
      setDealerVisible(dv || []);
      setPayout(p || 0);
      setResult(null);
      setResultMsg('');
      if (status === 'active') {
        setGameState('playing');
      } else {
        // immediate blackjack or push
        setResult(mapStatus(status));
        setResultMsg(
          status === 'blackjack' ? 'Blackjack! You win 3:2!' :
          status === 'push' ? 'Both Blackjack — Push!' : 'You lose.'
        );
        setGameState('done');
        fetchBalance();
      }
    } catch (err) {
      console.error('Blackjack start failed:', err);
    }
  };

  const handleHit = async () => {
    if (gameState !== 'playing') return;
    try {
      const res = await api.post('/games/blackjack/hit', {});
      const { playerHand: ph, playerTotal, status, payout: p, dealerHand: dh } = res.data.data;
      setPlayerHand(ph);
      if (status === 'bust') {
        setDealerHand(dh || dealerHand);
        setResult('lose');
        setResultMsg('Bust! You lose.');
        setGameState('done');
        setPayout(0);
        fetchBalance();
      }
    } catch (err) {
      console.error('Blackjack hit failed:', err);
    }
  };

  const handleStand = async () => {
    if (gameState !== 'playing') return;
    try {
      const res = await api.post('/games/blackjack/stand', {});
      const { playerHand: ph, dealerHand: dh, status, payout: p, multiplier } = res.data.data;
      setPlayerHand(ph);
      setDealerHand(dh);
      setPayout(p);
      setResult(mapStatus(status));
      setResultMsg(
        status === 'win' ? 'You win!' :
        status === 'push' ? 'Push!' : 'Dealer wins.'
      );
      setGameState('done');
      fetchBalance();
    } catch (err) {
      console.error('Blackjack stand failed:', err);
    }
  };

  const handleDouble = async () => {
    if (gameState !== 'playing') return;
    try {
      const res = await api.post('/games/blackjack/double', {});
      const { playerHand: ph, dealerHand: dh, status, payout: p } = res.data.data;
      setPlayerHand(ph);
      setDealerHand(dh);
      setPayout(p);
      setResult(mapStatus(status));
      setResultMsg(
        status === 'bust' ? 'Bust! You lose.' :
        status === 'win' ? 'You win!' :
        status === 'push' ? 'Push!' : 'Dealer wins.'
      );
      setGameState('done');
      fetchBalance();
    } catch (err) {
      console.error('Blackjack double failed:', err);
    }
  };

  const handleReset = () => {
    setGameState('idle');
    setPlayerHand([]);
    setDealerHand([]);
    setDealerVisible([]);
    setResult(null);
    setResultMsg('');
    setPayout(0);
  };

  const halfBet = () => { if (betAmount) setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount) setBetAmount((Number(betAmount) * 2).toString()); };

  const pTotal = handTotal(playerHand);
  const dTotal = handTotal(dealerHand);
  const isPlaying = gameState === 'playing';
  const isDone = gameState === 'done';

  const winnings = () => {
    if (payout > 0) return (payout - parseFloat(betAmount || 0)).toFixed(2);
    if (result === 'lose') return (-parseFloat(betAmount || 0)).toFixed(2);
    return '0.00';
  };

  return (
    <div className="bj-page">
      {/* Left Panel */}
      <div className="bj-panel">
        {/* Bet Amount */}
        <div className="bj-field">
          <div className="bj-field-label">
            <span>Bet Amount</span>
            <span>$0.00</span>
          </div>
          <div className="bj-input-row">
            <div className="bj-input-wrapper">
              <span className="bj-currency-icon">T</span>
              <input
                type="number"
                className="bj-input"
                placeholder="0"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || isPlaying || gameState === 'dealer'}
                min="0" step="1"
              />
            </div>
            <button className="bj-half-btn" onClick={halfBet} disabled={isPlaying}>½</button>
            <button className="bj-double-btn" onClick={doubleBet} disabled={isPlaying}>2×</button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bj-action-grid">
          <button
            className={`bj-action-btn hit ${!isPlaying ? 'disabled' : ''}`}
            onClick={handleHit}
            disabled={!isPlaying}
          >
            Hit 👊
          </button>
          <button
            className={`bj-action-btn stand ${!isPlaying ? 'disabled' : ''}`}
            onClick={handleStand}
            disabled={!isPlaying}
          >
            Stand 🖐
          </button>
          <button
            className={`bj-action-btn split ${(!canSplit || !isPlaying) ? 'disabled' : ''}`}
            onClick={handleSplit}
            disabled={!canSplit || !isPlaying}
          >
            Split ♦
          </button>
          <button
            className={`bj-action-btn double ${!isPlaying ? 'disabled' : ''}`}
            onClick={handleDouble}
            disabled={!isPlaying}
          >
            Double ×2
          </button>
        </div>

        {/* Bet / New Game Button */}
        {!isPlaying && gameState !== 'dealer' ? (
          <button
            className="bj-bet-btn"
            onClick={isDone ? handleReset : handleBet}
          >
            {isDone ? 'New Game' : 'Bet'}
          </button>
        ) : null}

        {/* Result display in panel */}
        {isDone && result && (
          <div className={`bj-panel-result ${result}`}>
            <div className="bj-panel-result-label">
              {result === 'win' || result === 'blackjack' ? '✅ Winner!' : result === 'push' ? '🤝 Push' : '❌ Lost'}
            </div>
            <div className="bj-panel-result-amount">
              {result !== 'lose' && result !== 'push' ? '+' : ''}{winnings()}
            </div>
          </div>
        )}
      </div>

      {/* Game Table */}
      <div className="bj-table">
        {/* Dealer Area */}
        <div className="bj-dealer-area">
          {(dealerHand.length > 0 || dealerVisible.length > 0) && (
            <HandDisplay
              hand={isPlaying ? dealerVisible : dealerHand}
              hideSecond={false}
              total={isPlaying ? handTotal(dealerVisible) : handTotal(dealerHand)}
              label="Dealer"
              showTotal={true}
            />
          )}
        </div>

        {/* Center Info */}
        <div className="bj-table-center">
          <div className="bj-table-rule">BLACKJACK PAYS 3 TO 2</div>
          <div className="bj-table-rule">INSURANCE PAYS 2 TO 1</div>

          {/* Result Overlay */}
          {isDone && result && (
            <div className={`bj-result-badge ${result}`}>
              {resultMsg}
            </div>
          )}
        </div>

        {/* Player Area */}
        <div className="bj-player-area">
          {playerHand.length > 0 && (
            <div className="bj-player-hands">
              <HandDisplay
                hand={playerHand}
                total={pTotal}
                label={isSplit ? (activeSplitHand === 0 ? '← Active Hand' : 'Hand 1') : ''}
                showTotal={true}
              />
              {isSplit && splitHand.length > 0 && (
                <HandDisplay
                  hand={splitHand}
                  total={handTotal(splitHand)}
                  label={activeSplitHand === 1 ? '← Active Hand' : 'Hand 2'}
                  showTotal={true}
                />
              )}
            </div>
          )}

          {gameState === 'idle' && (
            <div className="bj-idle-hint">
              Place your bet to start
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="bj-bottom-bar">
          <div className="bj-bottom-left">
            <button className="bj-icon-btn" title="Settings">⚙</button>
            <button className="bj-icon-btn" title="Fullscreen">⛶</button>
            <button className="bj-icon-btn" title="Stats">📊</button>
            <button className="bj-icon-btn" title="Share">↗</button>
          </div>
          <div className="bj-brand">Kings</div>
          <div className="bj-bottom-right">
            <button className="bj-fairness-btn">🛡 Fairness</button>
            <button className="bj-icon-btn">🎧</button>
          </div>
        </div>
      </div>
    </div>
  );
}
