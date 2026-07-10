import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import toast from 'react-hot-toast';
import './auth-modal.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal({ initialMode = 'login', onClose }) {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1 Virgin Islands (U.S.), Canada, United States of Ame');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Successfully logged in!');
      } else {
        await register(email, username, password, phoneNumber, countryCode);
        toast.success('Account created successfully!');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-header">
          <div className="auth-title">{isLogin ? 'Sign In' : 'Create Account'}</div>
          <button className="auth-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form className="auth-body" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <button 
            type="button" 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
              background: '#fff', color: '#000', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '15px'
            }}
            onClick={() => window.location.href = 'http://localhost:3001/api/auth/google/login'}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '13px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#374151' }}></div>
            <span style={{ padding: '0 12px' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#374151' }}></div>
          </div>

          {!isLogin && (
            <div className="auth-input-group">
              <label>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <label>{isLogin ? 'Email or Username' : 'Email'}</label>
            <input 
              type={isLogin ? 'text' : 'email'} 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder={isLogin ? 'Enter your email or username' : 'Enter your email'}
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="auth-input-group">
                <label>Country Code</label>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                  <option value="+1 Virgin Islands (U.S.), Canada, United States of Ame">+1 Virgin Islands (U.S.), Canada, United States of Ame</option>
                  <option value="+44 United Kingdom">+44 United Kingdom</option>
                  <option value="+61 Australia">+61 Australia</option>
                  <option value="+91 India">+91 India</option>
                </select>
              </div>

              <div className="auth-input-group">
                <label>Mobile Number</label>
                <input 
                  type="text" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <Loader className="animate-spin" size={16} /> : (isLogin ? 'Sign In' : 'Play Now')}
          </button>

          <div className="auth-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Register' : 'Sign In'}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
