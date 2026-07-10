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
  const [couponCode, setCouponCode] = useState('');
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

  const handleRedeem = async () => {
    setError('');
    setMessage('');
    if (!couponCode) {
      setError('Please enter a coupon code');
      return;
    }
    
    try {
      setLoading(true);
      if (couponCode.toLowerCase() === 'free100') {
        await deposit(100, `Coupon: ${couponCode}`);
        setMessage(`Coupon redeemed successfully! Added 100 ${currency.name}.`);
        setCouponCode('');
      } else {
        setError('Invalid or expired coupon code.');
      }
    } catch (err) {
      setError('Failed to redeem coupon.');
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
        </div>

        <div className="wallet-body">
          {error && <div style={{ color: '#ff2a2a', marginTop: '10px', fontSize: '14px' }}>{error}</div>}
          {message && <div style={{ color: '#00e701', marginTop: '10px', fontSize: '14px' }}>{message}</div>}

          {activeTab === 'deposit' && (
            <div className="deposit-section">
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '15px' }}>Redeem Coupon</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <input 
                    type="text" 
                    className="wallet-input" 
                    placeholder="Enter coupon code (try free100)" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    style={{ borderRadius: '8px' }}
                  />
                  <button 
                    className="submit-btn" 
                    onClick={handleRedeem}
                    disabled={loading || !couponCode}
                    style={{ backgroundColor: 'var(--accent-blue)', color: 'white', fontWeight: 'bold', borderRadius: '8px' }}
                  >
                    {loading ? <Loader className="animate-spin" size={16} /> : 'Redeem Coupon'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="withdraw-section">
              <div className="wallet-label">Currency</div>
              <button className="currency-selector-btn">
                <div className="left">
                  <span style={{ color: currency.color, fontWeight: 'bold' }}>{currency.symbol}</span>
                  {currency.name}
                </div>
                <ChevronDown size={16} />
              </button>
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

        </div>
      </div>
    </div>
  );
}
