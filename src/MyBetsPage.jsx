import React, { useState } from 'react';
import { FileText, X, Copy } from 'lucide-react';
import './my-bets.css';

const TOP_TABS = ['Settled', 'Active'];

const MOCK_BETS = [
  { id: '492832293325', date: 'July 7, 2026', amount: '0.00000000', multiplier: '2.00×', payout: '0.00000000', game: 'Dice', icon: '🎲' },
  { id: '492832149901', date: 'July 7, 2026', amount: '0.00000000', multiplier: '0.00×', payout: '0.00000000', game: 'Flip', icon: '🪙' },
  { id: '492831972769', date: 'July 7, 2026', amount: '0.00000000', multiplier: '0.00×', payout: '0.00000000', game: 'Moles', icon: '🔨' },
  { id: '492831911139', date: 'July 7, 2026', amount: '0.00000000', multiplier: '0.00×', payout: '0.00000000', game: 'Moles', icon: '🔨' },
  { id: '492831825227', date: 'July 7, 2026', amount: '0.00000000', multiplier: '2.29×', payout: '0.00000000', game: 'Moles', icon: '🔨' },
  { id: '492830655081', date: 'July 7, 2026', amount: '0.00000000', multiplier: '0.00×', payout: '0.00000000', game: 'Crash', icon: '📈' },
  { id: '492830356026', date: 'July 7, 2026', amount: '0.00000000', multiplier: '0.00×', payout: '0.00000000', game: 'Chicken', icon: '🐔' },
];

export default function MyBetsPage({ onClose }) {
  const [activeTopTab, setActiveTopTab] = useState('Settled');

  return (
    <div className="mb-page">
      {/* Header */}
      <div className="mb-page-header">
        <div className="mb-page-title">
          <FileText size={20} /> My Bets
        </div>
        <button className="mb-close-btn" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="mb-layout">
        {/* Content */}
        <div className="mb-right">
          <div className="mb-content">
            
            {/* Top Tabs */}
            <div className="mb-top-tabs">
              {TOP_TABS.map(tab => (
                <button
                  key={tab}
                  className={`mb-top-tab ${activeTopTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTopTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="mb-table">
              <div className="mb-table-header">
                <span>Date</span>
                <span className="mb-align-right">Bet Amount</span>
                <span className="mb-align-right">Multiplier</span>
                <span className="mb-align-right">Payout</span>
                <span>Game</span>
                <span className="mb-align-right">Bet ID</span>
              </div>
              
              <div className="mb-table-body">
                {MOCK_BETS.map(bet => {
                  const isWin = parseFloat(bet.multiplier) > 0;
                  return (
                    <div key={bet.id} className="mb-table-row">
                      <div className="mb-col-date">{bet.date}</div>
                      
                      <div className="mb-col-amount mb-align-right">
                        <span>{bet.amount}</span>
                        <span className="mb-usdt-icon">T</span>
                      </div>
                      
                      <div className="mb-col-mult mb-align-right">
                        {bet.multiplier}
                      </div>
                      
                      <div className={`mb-col-payout mb-align-right ${isWin ? 'win' : ''}`}>
                        <span>{bet.payout}</span>
                        <span className="mb-usdt-icon">T</span>
                      </div>
                      
                      <div className="mb-col-game">
                        <span className="mb-game-icon">{bet.icon}</span> {bet.game}
                      </div>
                      
                      <div className="mb-col-id mb-align-right">
                        <FileText size={14} className="mb-id-icon" /> {bet.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
