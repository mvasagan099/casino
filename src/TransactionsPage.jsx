import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import './transactions.css';

const NAV_TABS = ['Deposits', 'Withdrawals', 'Bonuses', 'Raffles', 'Races', 'Other'];

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
      <div className="tx-subtabs-wrapper">
        <div className="tx-subtabs">
          {subTabs.map(tab => (
            <button
              key={tab}
              className={`tx-subtab ${activeSubTab === tab ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="tx-table-header">
        {columns.map(col => <span key={col}>{col}</span>)}
      </div>
      <EmptyState message={emptyMsg} />
    </>
  );
}

function DepositsTab() {
  return (
    <>
      <div className="tx-table-header">
        <span>Date</span>
        <span>Amount</span>
        <span>Status</span>
        <span>View</span>
        <span>Payment Provider</span>
      </div>
      <EmptyState message="No Banking Deposits" />
    </>
  );
}

function WithdrawalsTab() {
  return (
    <>
      <div className="tx-table-header">
        <span>Date</span>
        <span>Amount</span>
        <span>Status</span>
        <span>View</span>
        <span>Payment Provider</span>
      </div>
      <EmptyState message="No Withdrawals" />
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

/* ── Footer ── */
function TransactionsFooter() {
  const columns = [
    { title: 'Casino', links: ['Casino Games', 'Slots', 'Live Casino', 'Roulette', 'Blackjack', 'Poker', 'Publishers'] },
    { title: 'Sports', links: ['Sportsbook', 'Live Sports', 'Soccer', 'Basketball', 'Tennis', 'Esports', 'Bet Bonuses'] },
    { title: 'Support', links: ['Help Center ↗', 'Fairness', 'Responsible Gambling', 'Gambling Helpline ↗', 'Live Support', 'Self Exclusion', 'Law Enforcement Request'] },
    { title: 'About Us', links: ['VIP Club', 'Affiliate', 'Privacy Policy', 'AML Policy', 'Terms of Service'] },
    { title: 'Payment Info', links: ['Deposit & Withdrawals', 'Currency Guide', 'Crypto Guide', 'Supported Crypto', 'How to Use the Vault', 'How Much to Bet With'] },
    { title: 'FAQ', links: ['How-to Guides', 'Online Casino Guide', 'Sports Betting Guide', 'How to Live Stream Sports', 'Kings VIP Guide', 'House Edge Guide'] },
  ];

  return (
    <footer className="tx-footer">
      <div className="tx-footer-grid">
        {columns.map(col => (
          <div key={col.title} className="tx-footer-col">
            <div className="tx-footer-title">{col.title}</div>
            {col.links.map(link => (
              <a key={link} href="#" className="tx-footer-link">{link}</a>
            ))}
          </div>
        ))}
      </div>
    </footer>
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
      case 'Raffles': return <RafflesTab />;
      case 'Races': return <RacesTab />;
      case 'Other': return <TableWithSubTabs subTabs={OTHER_SUB_TABS} emptyMsg="No entries." columns={['Date', 'Amount', 'Type']} />;
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
          <TransactionsFooter />
        </div>
      </div>
    </div>
  );
}
