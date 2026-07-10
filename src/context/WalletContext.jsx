import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    if (!user) {
      setBalance(0);
      setVaultBalance(0);
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.get('/wallet/balance');
      if (res.data.success) {
        setBalance(Number(res.data.data.balance));
        setVaultBalance(Number(res.data.data.vaultBalance));
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  const deposit = async (amount, description = 'Deposit') => {
    const res = await api.post('/wallet/deposit', { amount, description });
    if (res.data.success) {
      setBalance(Number(res.data.data.balance));
      return res.data.data;
    }
    throw new Error('Deposit failed');
  };

  const withdraw = async (amount, description = 'Withdrawal') => {
    const res = await api.post('/wallet/withdraw', { amount, description });
    if (res.data.success) {
      setBalance(Number(res.data.data.balance));
      return res.data.data;
    }
    throw new Error('Withdrawal failed');
  };

  return (
    <WalletContext.Provider value={{ balance, vaultBalance, loading, fetchBalance, deposit, withdraw, setBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
