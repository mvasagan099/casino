import React, { useState } from 'react';
import { X, Copy, ChevronDown, Check, Loader } from 'lucide-react';
import { useWallet } from './context/WalletContext';
import './wallet.css';

const currencies = [
  { name: 'USDT', label: 'Tether', color: '#26A17B', symbol: 'T' },
  { name: 'BTC', label: 'Bitcoin', color: '#F7931A', symbol: '₿' },
  { name: 'ETH', label: 'Ethereum', color: '#627EEA', symbol: 'Ξ' },
];

export default function WalletModal({ onClose }) {
  const { deposit, withdraw } = useWallet();
  const [activeTab, setActiveTab] = useState('deposit');
  const [currency, setCurrency] = useState(currencies[0]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) return;
    try {
      setLoading(true);
      setError('');
      setMessage('');
      await deposit(Number(amount), `Deposit via ${currency.name}`);
      setMessage(`Successfully deposited ${amount} ${currency.name}`);
      setAmount('');
      // setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return;
    try {
      setLoading(true);
      setError('');
      setMessage('');
      await withdraw(Number(amount), `Withdrawal via ${currency.name}`);
      setMessage(`Successfully withdrew ${amount} ${currency.name}`);
      setAmount('');
      // setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={e => e.stopPropagation()}>
        <div className="wallet-header">
          <div className="wallet-title">Wallet</div>
          <button className="wallet-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="wallet-tabs">
          <button className={`wallet-tab ${activeTab === 'deposit' ? 'active' : ''}`} onClick={() => { setActiveTab('deposit'); setMessage(''); setError(''); setAmount(''); }}>Deposit</button>
          <button className={`wallet-tab ${activeTab === 'withdraw' ? 'active' : ''}`} onClick={() => { setActiveTab('withdraw'); setMessage(''); setError(''); setAmount(''); }}>Withdraw</button>
          <button className={`wallet-tab ${activeTab === 'buy' ? 'active' : ''}`} onClick={() => { setActiveTab('buy'); setMessage(''); setError(''); }}>Buy Crypto</button>
        </div>

        <div className="wallet-body">
          <div className="wallet-label">Currency</div>
          <button className="currency-selector-btn">
            <div className="left">
              <span style={{ color: currency.color, fontWeight: 'bold' }}>{currency.symbol}</span>
              {currency.name}
            </div>
            <ChevronDown size={16} />
          </button>

          {error && <div style={{ color: '#ff2a2a', marginTop: '10px', fontSize: '14px' }}>{error}</div>}
          {message && <div style={{ color: '#00e701', marginTop: '10px', fontSize: '14px' }}>{message}</div>}

          {activeTab === 'deposit' && (
            <div className="deposit-section">
              <div className="wallet-input-group">
                <label className="wallet-label">Amount</label>
                <input 
                  type="number" 
                  className="wallet-input" 
                  placeholder="Enter amount to deposit" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <button 
                className="submit-btn" 
                onClick={handleDeposit} 
                style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
                disabled={loading || !amount}
              >
                {loading ? <Loader className="animate-spin" size={16} /> : `Deposit ${currency.name}`}
              </button>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
                Funds will be instantly credited to your balance.
              </p>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="withdraw-section">
              <div className="wallet-input-group">
                <label className="wallet-label">{currency.name} Address</label>
                <input type="text" className="wallet-input" placeholder={`Enter destination ${currency.name} address`} />
              </div>
              <div className="wallet-input-group">
                <label className="wallet-label">Amount</label>
                <input 
                  type="number" 
                  className="wallet-input" 
                  placeholder={`0.00`} 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <button 
                className="submit-btn" 
                onClick={handleWithdraw}
                disabled={loading || !amount}
              >
                {loading ? <Loader className="animate-spin" size={16} /> : `Withdraw ${currency.name}`}
              </button>
            </div>
          )}

          {activeTab === 'buy' && (
            <div className="buy-section" style={{ textAlign: 'center', padding: '40px 0' }}>
              <h3 style={{ color: 'white', marginBottom: '12px' }}>Buy Crypto Instantly</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                Use your credit card, Apple Pay, or Google Pay to securely buy crypto and start playing immediately.
              </p>
              <button className="submit-btn" style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}>
                Buy via MoonPay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
