import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { useAuth } from './context/AuthContext';
import { Users, DollarSign, Activity, ShieldAlert, CheckCircle, Search } from 'lucide-react';
import './admin.css';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banReason, setBanReason] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=20')
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId) => {
    if (!banReason) return alert('Reason required');
    try {
      await api.post('/admin/users/ban', { userId, reason: banReason });
      setBanReason('');
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      alert('Failed to ban user');
    }
  };

  const handleUnban = async (userId) => {
    try {
      await api.post('/admin/users/unban', { userId });
      fetchData();
    } catch (err) {
      alert('Failed to unban user');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="admin-page-denied">
        <ShieldAlert size={64} className="admin-icon-denied" />
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading || !stats) {
    return <div className="admin-loading">Loading Admin Panel...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage users, view statistics, and monitor site activity.</p>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon users"><Users size={24} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Users</span>
            <span className="admin-stat-value">{stats.totalUsers}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon wallet"><DollarSign size={24} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Balances</span>
            <span className="admin-stat-value">${stats.totalBalance.toFixed(2)}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon wagers"><Activity size={24} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Wagered</span>
            <span className="admin-stat-value">${stats.totalWagered.toFixed(2)}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon profit"><CheckCircle size={24} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">House Profit</span>
            <span className="admin-stat-value" style={{ color: stats.houseProfit >= 0 ? '#00e701' : '#ff3333' }}>
              ${stats.houseProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-content-grid">
        <div className="admin-users-section">
          <h2>Recent Users</h2>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Balance</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>${Number(u.wallet?.balance || 0).toFixed(2)}</td>
                    <td>
                      <span className={`admin-role-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                    </td>
                    <td>
                      {u.role === 'BANNED' ? (
                        <button className="admin-btn unban" onClick={() => handleUnban(u.id)}>Unban</button>
                      ) : (
                        <button className="admin-btn ban" onClick={() => setSelectedUser(u)}>Ban</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-bets-section">
          <h2>Recent Bets</h2>
          <div className="admin-bets-list">
            {stats.recentBets.map(bet => (
              <div key={bet.id} className="admin-bet-item">
                <div className="admin-bet-header">
                  <span className="admin-bet-user">{bet.user?.username}</span>
                  <span className="admin-bet-game">{bet.game?.name}</span>
                </div>
                <div className="admin-bet-details">
                  <span className="admin-bet-amt">Bet: ${Number(bet.amount).toFixed(2)}</span>
                  <span className={`admin-bet-payout ${bet.payout > 0 ? 'won' : 'lost'}`}>
                    Payout: ${Number(bet.payout).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {stats.recentBets.length === 0 && <div className="admin-empty">No recent bets</div>}
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Ban User: {selectedUser.username}</h3>
            <input 
              type="text" 
              placeholder="Reason for ban..."
              className="admin-input"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
            <div className="admin-modal-actions">
              <button className="admin-btn cancel" onClick={() => setSelectedUser(null)}>Cancel</button>
              <button className="admin-btn ban-confirm" onClick={() => handleBan(selectedUser.id)}>Confirm Ban</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
