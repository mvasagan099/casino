import React, { useState, useEffect } from 'react';
import { FileText, X, Loader } from 'lucide-react';
import { api } from './api/client';
import './transactions.css';

const NAV_TABS = ['Deposits', 'Withdrawals', 'Bonuses'];

const BONUS_SUB_TABS = ['All Bonuses', 'Manual', 'Promotional', 'Drop', 'Rakeback', 'Reload', 'Race Payout', 'Sportsbook Prom'];
const OTHER_SUB_TABS = ['All Other', 'Tips Received', 'Vault Deposit', 'Vault Withdrawal', 'Campaign Withdrawal', 'Rain Received'];

function EmptyState({ message }) {
  return (
    <div className="tx-empty">
      <div className="tx-empty-icon">🎰</div>
      <div className="tx-empty-text">{message}</div>
    </div>
  );
}

function TableWithSubTabs({ subTabs, emptyMsg, columns }) {
  const [activeSubTab, setActiveSubTab] = useState(subTabs[0]);

  return (
    <>
      <div className="tx-table-header">
        {columns.map(col => <span key={col}>{col}</span>)}
      </div>
      <EmptyState message={emptyMsg} />
    </>
  );
}

function DepositsTab() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        const res = await api.get('/wallet/transactions?type=DEPOSIT');
        setDeposits(res.data?.data?.transactions?.slice(0, 20) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeposits();
  }, []);

  return (
    <>
      <div className="tx-table-header">
        <span>Date</span>
        <span>Amount</span>
        <span>Status</span>
        <span>View</span>
        <span>Payment Provider</span>
      </div>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-dark)' }}>
          <Loader className="animate-spin" style={{ margin: '0 auto', color: 'var(--text-muted)' }} />
        </div>
      ) : deposits.length === 0 ? (
        <EmptyState message="No Banking Deposits" />
      ) : (
        <div style={{ backgroundColor: 'var(--bg-dark)' }}>
          {deposits.map(tx => (
            <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: '14px 24px', fontSize: '13px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-main)' }}>
                {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
              </div>
              <div style={{ color: '#00e701', display: 'flex', alignItems: 'center', gap: '4px' }}>
                +{tx.amount} <span style={{ color: 'var(--text-muted)' }}>T</span>
              </div>
              <div style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
                {tx.status.toLowerCase()}
              </div>
              <div>
                <FileText size={16} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
              </div>
              <div style={{ color: 'var(--text-muted)' }}>Internal</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const res = await api.get('/wallet/transactions?type=WITHDRAWAL');
        setWithdrawals(res.data?.data?.transactions?.slice(0, 20) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWithdrawals();
  }, []);

  return (
    <>
      <div className="tx-table-header">
        <span>Date</span>
        <span>Amount</span>
        <span>Status</span>
        <span>View</span>
        <span>Payment Provider</span>
      </div>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-dark)' }}>
          <Loader className="animate-spin" style={{ margin: '0 auto', color: 'var(--text-muted)' }} />
        </div>
      ) : withdrawals.length === 0 ? (
        <EmptyState message="No Withdrawals" />
      ) : (
        <div style={{ backgroundColor: 'var(--bg-dark)' }}>
          {withdrawals.map(tx => (
            <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: '14px 24px', fontSize: '13px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-main)' }}>
                {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
              </div>
              <div style={{ color: '#ff2a2a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                -{tx.amount} <span style={{ color: 'var(--text-muted)' }}>T</span>
              </div>
              <div style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
                {tx.status.toLowerCase()}
              </div>
              <div>
                <FileText size={16} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
              </div>
              <div style={{ color: 'var(--text-muted)' }}>Internal</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function RafflesTab() {
  return (
    <>
      <div className="tx-table-header">
        <span>Date</span>
        <span>Amount</span>
        <span>Type</span>
      </div>
      <EmptyState message="No Raffle entries." />
    </>
  );
}

function RacesTab() {
  return (
    <>
      <div className="tx-table-header">
        <span>Date</span>
        <span>Amount</span>
        <span>Type</span>
      </div>
      <EmptyState message="No Race payouts." />
    </>
  );
}

/* ── Main Component ── */
export default function TransactionsPage({ onClose }) {
  const [activeTab, setActiveTab] = useState('Deposits');

  const renderContent = () => {
    switch (activeTab) {
      case 'Deposits': return <DepositsTab />;
      case 'Withdrawals': return <WithdrawalsTab />;
      case 'Bonuses': return <TableWithSubTabs subTabs={BONUS_SUB_TABS} emptyMsg="No entries." columns={['Date', 'Amount', 'Type']} />;
      default: return <DepositsTab />;
    }
  };

  return (
    <div className="tx-page">
      {/* Header */}
      <div className="tx-page-header">
        <div className="tx-page-title">
          <FileText size={20} /> Transactions
        </div>
        <button className="tx-close-btn" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="tx-layout">
        {/* Left sidebar */}
        <nav className="tx-sidenav">
          {NAV_TABS.map(tab => (
            <button
              key={tab}
              className={`tx-sidenav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="tx-right">
          <div className="tx-content">
            {renderContent()}
          </div>

        </div>
      </div>
    </div>
  );
}
