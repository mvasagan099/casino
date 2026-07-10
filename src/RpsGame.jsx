import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { useWallet } from './context/WalletContext';
import './rps.css';

const MOVES = {
  Rock: { beats: 'Scissors', losesTo: 'Paper', icon: '🪨' },
  Paper: { beats: 'Rock', losesTo: 'Scissors', icon: '📄' },
  Scissors: { beats: 'Paper', losesTo: 'Rock', icon: '✂️' }
};

const MOVE_KEYS = Object.keys(MOVES);

export default function RpsGame() {
  const { fetchBalance, balance } = useWallet();
  const [mode, setMode] = useState('Manual');
  const [betAmount, setBetAmount] = useState('0');
  
  const [status, setStatus] = useState('idle'); // idle, playing, cashed_out, lost
  const [streak, setStreak] = useState(0); // number of wins
  const [currentMult, setCurrentMult] = useState(1.00);
  
  // History of moves in the current round
  const [roundMoves, setRoundMoves] = useState([]); // { player, computer, result }
  
  // Animation state
  const [isResolving, setIsResolving] = useState(false);
  const [tempMove, setTempMove] = useState(null); // the move currently being animated

  const halfBet = () => { if (betAmount && status !== 'playing') setBetAmount(Math.floor(Number(betAmount) / 2).toString()); };
  const doubleBet = () => { if (betAmount && status !== 'playing') setBetAmount((Number(betAmount) * 2).toString()); };

  const startRound = async () => {
    if (parseFloat(betAmount) < 0) return;
    try {
      await api.post('/games/rps/start', { amount: parseFloat(betAmount) || 0 });
      setStatus('playing');
      setStreak(0);
      setCurrentMult(1.00);
      setRoundMoves([]);
      setIsResolving(false);
      setTempMove(null);
      fetchBalance();
    } catch (err) {
      console.error('RPS start failed:', err);
    }
  };

  const executeMove = async (playerMove) => {
    if (status !== 'playing' || isResolving) return;
    setIsResolving(true);
    setTempMove({ player: playerMove, computer: null, result: null });
    
    try {
      const res = await api.post('/games/rps/move', { playerMove });
      const { result, computerMove, streak: newStreak, currentMult: newMult, lost } = res.data.data;
      
      setTimeout(() => {
        setTempMove({ player: playerMove, computer: computerMove, result });
        setTimeout(() => {
          if (lost) {
            setStatus('lost');
            setRoundMoves(prev => [...prev, { player: playerMove, computer: computerMove, result: 'lose' }]);
            fetchBalance();
          } else if (result === 'win') {
            setStreak(newStreak);
            setCurrentMult(newMult);
            setRoundMoves(prev => [...prev, { player: playerMove, computer: computerMove, result: 'win' }]);
          }
          setIsResolving(false);
          setTempMove(null);
        }, 1000);
      }, 600);
    } catch (err) {
      console.error('RPS move failed:', err);
      setIsResolving(false);
      setTempMove(null);
    }
  };

  const handleCashout = async () => {
    if (status !== 'playing' || isResolving || streak === 0) return;
    try {
      const res = await api.post('/games/rps/cashout', {});
      const { payout } = res.data.data;
      setStatus('cashed_out');
      fetchBalance();
    } catch (err) {
      console.error('RPS cashout failed:', err);
    }
  };

  const playRandom = () => {
    if (status === 'playing' && !isResolving) {
      executeMove(MOVE_KEYS[Math.floor(Math.random() * MOVE_KEYS.length)]);
    }
  };

  // Render slots. Show up to 5 at a time, sliding window if streak > 5
  const displayStartIndex = Math.max(0, streak - 4);
  const displaySlots = Array.from({ length: 5 }, (_, i) => {
    const slotIdx = displayStartIndex + i;
    const pastMove = roundMoves[slotIdx];
    const isCurrentActive = slotIdx === streak && status === 'playing';
    const multForSlot = slotIdx === 0 ? 1.96 : 1.96 * Math.pow(2, slotIdx);

    return {
      index: slotIdx,
      mult: multForSlot,
      move: pastMove,
      isActive: isCurrentActive
    };
  });

  const profitOnWin = (parseFloat(betAmount) * currentMult).toFixed(2);

  return (
    <div className="rps-page">
      <div className="rps-panel">
        <div className="rps-mode-tabs">
          <button className={`rps-mode-tab ${mode === 'Manual' ? 'active' : ''}`} onClick={() => setMode('Manual')}>Manual</button>
          <button className={`rps-mode-tab ${mode === 'Auto' ? 'active' : ''}`} onClick={() => setMode('Auto')}>Auto</button>
        </div>

        <div className="rps-field">
          <div className="rps-field-label"><span>Bet Amount</span><span>$0.00</span></div>
          <div className="rps-input-row">
            <div className="rps-input-wrap">
              <span className="rps-cur">Ł</span>
              <input
                type="number" className="rps-input" placeholder="0"
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                disabled={Number(balance) <= 0 || status === 'playing'} min="0" step="1"
              />
            </div>
            <button className="rps-sm-btn" onClick={halfBet} disabled={status === 'playing'}>½</button>
            <button className="rps-sm-btn" onClick={doubleBet} disabled={status === 'playing'}>2×</button>
          </div>
        </div>

        {status === 'playing' ? (
          <>
            <button 
              className={`rps-bet-btn cashout ${streak === 0 || isResolving ? 'disabled' : ''}`} 
              onClick={handleCashout}
              disabled={streak === 0 || isResolving}
            >
              Cashout
            </button>
            <button className="rps-sec-btn" onClick={playRandom} disabled={isResolving}>
              Random Pick
            </button>
            <div className="rps-mini-btn-row">
              {MOVE_KEYS.map(k => (
                <button key={k} className="rps-mini-btn" onClick={() => executeMove(k)} disabled={isResolving}>
                  {k} {MOVES[k].icon}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button className="rps-bet-btn" onClick={startRound} disabled={parseFloat(betAmount) < 0}>
            Bet
          </button>
        )}

        <div className="rps-field" style={{ marginTop: '12px' }}>
          <div className="rps-field-label">
            <span>Total Profit ({currentMult.toFixed(2)}×)</span>
            <span>$0.00</span>
          </div>
          <div className="rps-input-wrap disabled">
            <input type="text" className="rps-input" value={profitOnWin} readOnly />
            <span className="rps-cur">Ł</span>
          </div>
        </div>
      </div>

      <div className="rps-game-area">
        <div className="rps-board-wrapper">
          <div className="rps-machine">
            
            <div className="rps-track-container">
              {/* Computer Cards Row */}
              <div className="rps-card-row computer-row">
                {displaySlots.map((slot, i) => {
                  let isFlipped = false;
                  let computerIcon = '';
                  let cardClass = '';
                  
                  if (slot.move) {
                    isFlipped = true;
                    computerIcon = MOVES[slot.move.computer].icon;
                    cardClass = slot.move.result; // win, lose
                  } else if (slot.isActive && tempMove && tempMove.computer) {
                    isFlipped = true;
                    computerIcon = MOVES[tempMove.computer].icon;
                    cardClass = tempMove.result;
                  }
                  
                  return (
                    <div key={`comp-${slot.index}`} className={`rps-card ${isFlipped ? 'flipped' : ''}`}>
                      <div className="rps-card-inner">
                        <div className="rps-card-front">Kings</div>
                        <div className={`rps-card-back ${cardClass}`}>
                          {computerIcon}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multiplier Row */}
              <div className="rps-mult-row">
                {displaySlots.map((slot) => (
                  <div key={`mult-${slot.index}`} className={`rps-mult-pill ${slot.isActive ? 'active' : ''}`}>
                    {slot.mult.toFixed(2)}×
                  </div>
                ))}
              </div>

              {/* Player Slots Row */}
              <div className="rps-card-row player-row">
                {displaySlots.map((slot) => {
                  let playerIcon = '';
                  let statusClass = '';
                  
                  if (slot.move) {
                    playerIcon = MOVES[slot.move.player].icon;
                    statusClass = slot.move.result;
                  } else if (slot.isActive && tempMove) {
                    playerIcon = MOVES[tempMove.player].icon;
                    if (tempMove.result) statusClass = tempMove.result;
                    else statusClass = 'pending';
                  }
                  
                  return (
                    <div key={`play-${slot.index}`} className={`rps-slot ${slot.isActive ? 'active' : ''} ${statusClass}`}>
                      {playerIcon && <span className="slot-icon">{playerIcon}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tie Notification Overlay */}
            {tempMove && tempMove.result === 'tie' && (
              <div className="rps-tie-msg">TIE! REPLAYING ROUND</div>
            )}

            {/* Huge Selection Buttons below track */}
            <div className="rps-selection-console">
              <div className="console-line"></div>
              <div className="console-buttons">
                {MOVE_KEYS.map(k => (
                  <button 
                    key={k} 
                    className={`console-btn ${isResolving || status !== 'playing' ? 'disabled' : ''}`}
                    onClick={() => executeMove(k)}
                    disabled={isResolving || status !== 'playing'}
                  >
                    <div className="console-btn-inner">
                      {MOVES[k].icon}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Result Overlay */}
            {(status === 'cashed_out' || status === 'lost') && (
              <div className={`rps-result-overlay ${status}`}>
                {status === 'lost' ? (
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

        {/* Bottom Bar */}
        <div className="rps-bottom-bar">
          <div className="rps-bl">
            <button className="rps-icon-btn">⚙</button>
            <button className="rps-icon-btn">⛶</button>
            <button className="rps-icon-btn">📊</button>
          </div>
          <div className="rps-brand">Kings</div>
          <div className="rps-br">
            <button className="rps-fair-btn">🛡 Fairness</button>
          </div>
        </div>
      </div>
    </div>
  );
}
