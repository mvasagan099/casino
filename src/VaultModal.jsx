import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import './vault.css';

const currencies = [
  { name: 'BTC', label: 'Bitcoin', color: '#F7931A', symbol: '₿' },
  { name: 'ETH', label: 'Ethereum', color: '#627EEA', symbol: 'Ξ' },
  { name: 'LTC', label: 'Litecoin', color: '#BFBBBB', symbol: 'Ł' },
  { name: 'USDT', label: 'Tether', color: '#26A17B', symbol: 'T' },
  { name: 'SOL', label: 'Solana', color: '#00FFA3', symbol: 'S' },
  { name: 'DOGE', label: 'Dogecoin', color: '#C2A633', symbol: 'Ð' },
  { name: 'BCH', label: 'Bitcoin Cash', color: '#8DC351', symbol: 'B' },
  { name: 'XRP', label: 'Ripple', color: '#346aa9', symbol: '✕' },
  { name: 'TRX', label: 'TRON', color: '#FF0013', symbol: '▼' },
];

export default function VaultModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('Deposit');
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[2]); // LTC
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [amount, setAmount] = useState('0.00000000');

  return (
    <div className="vault-overlay" onClick={onClose}>
      <div className="vault-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="vault-header">
          <div className="vault-title">
            <span className="vault-icon">🔒</span> Vault
          </div>
          <button className="vault-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="vault-tabs">
          {['Deposit', 'Withdraw'].map(tab => (
            <button
              key={tab}
              className={`vault-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="vault-body">
          <div className="vault-label">Vault Balance</div>

          {/* Currency Selector */}
          <div className="vault-currency-btn" onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}>
            <div className="vault-cur-left">
              <span className="vault-cur-circle" style={{ background: selectedCurrency.color }}>
                {selectedCurrency.symbol}
              </span>
              <div>
                <div className="vault-cur-name">{selectedCurrency.name}</div>
                <div className="vault-cur-label">{selectedCurrency.label}</div>
              </div>
            </div>
            <div className="vault-cur-right">
              <div>
                <div className="vault-cur-balance">0.00000000</div>
                <div className="vault-cur-usd">$0.00 USD</div>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>

          {/* Currency Dropdown */}
          {isCurrencyOpen && (
            <div className="vault-cur-dropdown">
              {currencies.map(cur => (
                <div
                  key={cur.name}
                  className={`vault-cur-item ${selectedCurrency.name === cur.name ? 'selected' : ''}`}
                  onClick={() => { setSelectedCurrency(cur); setIsCurrencyOpen(false); }}
                >
                  <span className="vault-cur-circle" style={{ background: cur.color }}>{cur.symbol}</span>
                  <div>
                    <div className="vault-cur-name">{cur.name}</div>
                    <div className="vault-cur-label">{cur.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Amount */}
          <div className="vault-amount-label">
            Amount <span className="vault-usd-label">$0.00</span>
          </div>
          <div className="vault-amount-row">
            <input
              className="vault-amount-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <span className="vault-amount-cur" style={{ color: selectedCurrency.color }}>
              {selectedCurrency.symbol}
            </span>
            <button className="vault-max-btn">Max</button>
          </div>

          {/* Google button */}
          <button className="vault-google-btn">
            <img
              src="https://www.google.com/favicon.ico"
              alt="G"
              style={{ width: 18, height: 18, borderRadius: '50%' }}
            />
            Re-verify with Google
          </button>

          <div className="vault-learn">Learn More About Vault</div>
        </div>
      </div>
    </div>
  );
}
