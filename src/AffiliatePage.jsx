import React, { useState, useEffect } from 'react';
import {
  Users, Copy, ChevronDown, SortAsc, Filter, Download,
  HelpCircle, ChevronRight, X, Zap, Percent, Globe, Clock,
  MessageSquare, RefreshCw, ChevronUp, Info
} from 'lucide-react';
import { api } from './api/client';
import './affiliate.css';

const TABS = ['Overview', 'Campaigns', 'Commission', 'Referred Users', 'FAQ'];

/* ─────────────────────────────────────────────────────────────
   Overview Tab
───────────────────────────────────────────────────────────── */
function OverviewTab({ stats }) {
  const [copied, setCopied] = useState(false);

  const affiliateUrl = stats?.affiliateCode 
    ? `${window.location.origin}/?c=${stats.affiliateCode}`
    : 'Generating...';

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const advantages = [
    { icon: <Zap size={24} />, title: 'Instant Payout', desc: 'Skip the wait. See earnings instantly in your account.' },
    { icon: <Clock size={24} />, title: 'Lifetime Commission', desc: 'If the people you refer keep playing, you keep getting paid.' },
    { icon: <Percent size={24} />, title: 'Market Leading Player Value', desc: 'Grow your earnings with some of the highest returns offered to players.' },
    { icon: <RefreshCw size={24} />, title: 'Customise Your Commission', desc: 'Tailor your commission plan to fit your unique business needs.' },
    { icon: <Globe size={24} />, title: 'Crypto & Local Currencies', desc: 'Earn your way with support for both cryptocurrency and local currency.' },
    { icon: <MessageSquare size={24} />, title: '24x7 Multi Language Support', desc: 'Get the help you want in your preferred language all day.' },
  ];

  return (
    <div className="af-content">
      <div className="af-overview-top">
        {/* Left: info */}
        <div className="af-overview-info">
          <h2 className="af-section-title">Overview</h2>
          <p className="af-desc">Earn commission for all bets placed by your referrals across Casino and Sportsbook.</p>

          <div className="af-stats-row">
            <div className="af-stat">
              <strong>42.4M</strong>
              <span>Worldwide Customers</span>
            </div>
            <div className="af-stat">
              <strong>85+</strong>
              <span>Payment Methods</span>
            </div>
            <div className="af-stat">
              <strong>17</strong>
              <span>Languages Supported</span>
            </div>
          </div>

          <div className="af-link-section">
            <label>Affiliate Link</label>
            <div className="af-link-input-row">
              <input type="text" readOnly value={affiliateUrl} className="af-link-input" />
              <button className="af-copy-btn" onClick={handleCopy}>
                {copied ? '✓' : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: video thumbnail */}
        <div className="af-video-thumb">
          <div className="af-video-inner">
            <div className="af-video-label">Affiliate Program | Kings.com</div>
            <div className="af-social-grid">
              <div className="af-social-item af-yt">▶</div>
              <div className="af-social-item" style={{background:'#1DA1F2'}}>𝕏</div>
              <div className="af-social-item" style={{background:'#6441a5'}}>📺</div>
              <div className="af-social-item" style={{background:'#25D366'}}>💬</div>
              <div className="af-social-item" style={{background:'#000'}}>🎵</div>
              <div className="af-social-item" style={{background:'#1877F2'}}>f</div>
              <div className="af-social-item" style={{background:'#E1306C'}}>📸</div>
              <div className="af-social-item" style={{background:'#FF0000'}}>▶</div>
            </div>
            <div className="af-video-footer">SOCIAL NETWORK</div>
          </div>
        </div>
      </div>

      {/* Exclusive Advantages */}
      <h3 className="af-advantages-title">Exclusive Advantages</h3>
      <div className="af-advantages-grid">
        {advantages.map((adv, i) => (
          <div className="af-advantage-card" key={i}>
            <div className="af-adv-icon">{adv.icon}</div>
            <div>
              <div className="af-adv-title">{adv.title}</div>
              <div className="af-adv-desc">{adv.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Campaigns Tab
───────────────────────────────────────────────────────────── */
function CampaignsTab({ stats }) {
  return (
    <div className="af-content">
      <h2 className="af-section-title">Campaigns</h2>
      <p className="af-desc">See the performance of all your campaigns in one simple view below.</p>

      <div className="af-campaign-stats">
        {[
          { label: 'Campaign Hits', val: '0' },
          { label: 'Referred Users', val: stats?.totalReferrals || '0' },
          { label: 'First Time Deposits (FTD)', val: '0' },
          { label: 'Total Deposits', val: '0' },
          { label: 'Overall Commission', val: `$${(stats?.totalEarnings || 0).toFixed(2)} USD` },
        ].map((s, i) => (
          <div className="af-campaign-stat" key={i}>
            <div className="af-cstat-label">{s.label} <Info size={12} /></div>
            <div className="af-cstat-val">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="af-toolbar">
        <div className="af-sort-row">
          <SortAsc size={16} />
          <span>Sort</span>
          <button className="af-dropdown-btn">Date Created: New to Old <ChevronDown size={14} /></button>
        </div>
        <div className="af-toolbar-right">
          <button className="af-icon-btn"><Filter size={16} /></button>
          <button className="af-icon-btn"><Download size={16} /></button>
          <button className="af-create-btn">Create Campaign</button>
        </div>
      </div>

      <div className="af-campaign-row">
        <div className="af-campaign-name">Default Campaign</div>
        <div className="af-campaign-meta">Active <ChevronDown size={14} /></div>
      </div>

      <div className="af-pagination">
        <button className="af-page-btn" disabled>Previous</button>
        <button className="af-page-btn" disabled>Next</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Commission Tab
───────────────────────────────────────────────────────────── */
const currencies = ['BTC','ETH','LTC','USDT','SOL','DOGE','BCH','XRP','TRX'];
const currencyColors = {
  BTC:'#F7931A', ETH:'#627EEA', LTC:'#BFBBBB', USDT:'#26A17B',
  SOL:'#00FFA3', DOGE:'#C2A633', BCH:'#8DC351', XRP:'#23292F', TRX:'#FF0013'
};

function CommissionTab({ stats }) {
  return (
    <div className="af-content">
      <h2 className="af-section-title">Commission</h2>
      <p className="af-desc">View and track the earnings you've generated through your referrals. This section provides a clear breakdown of your commissions and payouts — keeping you in control of your earnings.</p>

      <div className="af-toolbar">
        <div className="af-sort-row">
          <SortAsc size={16} />
          <span>Sort</span>
          <button className="af-dropdown-btn">Lifetime Commission: High to L... <ChevronDown size={14} /></button>
        </div>
        <div className="af-toolbar-right">
          <button className="af-icon-btn af-filter-blue"><Filter size={16} /></button>
          <button className="af-transfer-btn">Transfer to Balance</button>
        </div>
      </div>

      <div className="af-table">
        <div className="af-table-header">
          <span>Currencies</span>
          <span>Available Commission</span>
          <span>Withdrawn Commission</span>
          <span>Lifetime Commission</span>
        </div>
        {currencies.map(cur => (
          <div className="af-table-row" key={cur}>
            <span className="af-cur-name">
              <span className="af-cur-dot" style={{ background: currencyColors[cur] }}></span>
              {cur}
            </span>
            <span className="af-cur-val">{(stats?.totalEarnings || 0).toFixed(8)} <span className="af-cur-dot-sm" style={{ background: currencyColors[cur] }}></span></span>
            <span className="af-cur-val">0.00000000 <span className="af-cur-dot-sm" style={{ background: currencyColors[cur] }}></span></span>
            <span className="af-cur-val">{(stats?.totalEarnings || 0).toFixed(8)} <span className="af-cur-dot-sm" style={{ background: currencyColors[cur] }}></span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Referred Users Tab
───────────────────────────────────────────────────────────── */
function ReferredUsersTab() {
  return (
    <div className="af-content">
      <h2 className="af-section-title">Referred Users</h2>
      <p className="af-desc">Track all the users who joined through your referral link. Here you can see their activity and gameplay — making it easy to monitor the growth of your network and the benefits you're gaining from referrals.</p>

      <div className="af-campaign-select-row">
        <label>Campaign</label>
        <button className="af-dropdown-btn">loruipr (Abi2UNIf) <ChevronDown size={14} /></button>
      </div>

      <div className="af-referred-card">
        <div className="af-referred-total">Total Referred Users: 0</div>
        <div className="af-referred-stats">
          {[
            { label: 'First Time Deposits (FTD)', val: '0' },
            { label: 'Monthly FTD', val: '0' },
            { label: 'Total Deposits', val: '0' },
            { label: 'VIP Users', val: '0' },
          ].map((s, i) => (
            <div className="af-rstat" key={i}>
              <div className="af-rstat-label">{s.label} <Info size={12} /></div>
              <div className="af-rstat-val">{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="af-toolbar" style={{marginTop: 16}}>
        <div className="af-sort-row">
          <SortAsc size={16} />
          <span>Sort</span>
          <button className="af-dropdown-btn">Total Deposits: High to Low <ChevronDown size={14} /></button>
        </div>
      </div>

      <div className="af-empty-state">
        <div className="af-empty-icon">🎰</div>
        <div className="af-empty-text">No Referred Users.</div>
      </div>

      <div className="af-pagination">
        <button className="af-page-btn" disabled>Previous</button>
        <button className="af-page-btn" disabled>Next</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FAQ Tab
───────────────────────────────────────────────────────────── */
const faqCategories = ['General', 'Affiliate Program', 'Earnings'];
const faqs = [
  'What is the Kings Affiliate Program?',
  'Who can join the Kings Affiliate Program?',
  'How do I join the Kings Affiliate Program?',
  'What are the benefits of joining the Kings Affiliate Program?',
];

function FAQTab() {
  const [activeCategory, setActiveCategory] = useState('General');
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="af-content">
      <div className="af-faq-tabs">
        {faqCategories.map(cat => (
          <button
            key={cat}
            className={`af-faq-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="af-faq-list">
        {faqs.map((q, i) => (
          <div className="af-faq-item" key={i} onClick={() => setOpenIndex(openIndex === i ? null : i)}>
            <span>{q}</span>
            {openIndex === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Affiliate Component
───────────────────────────────────────────────────────────── */
export default function AffiliatePage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/affiliate/stats').then(res => {
      if(res.data.success) {
        setStats(res.data.data);
      }
    }).catch(console.error);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview': return <OverviewTab stats={stats} />;
      case 'Campaigns': return <CampaignsTab stats={stats} />;
      case 'Commission': return <CommissionTab stats={stats} />;
      case 'Referred Users': return <ReferredUsersTab stats={stats} />;
      case 'FAQ': return <FAQTab />;
      default: return <OverviewTab stats={stats} />;
    }
  };

  return (
    <div className="af-page">
      {/* Page Header */}
      <div className="af-page-header">
        <div className="af-page-title">
          <Users size={20} /> Affiliate Program
        </div>
      </div>

      <div className="af-layout">
        {/* Left nav */}
        <nav className="af-sidenav">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`af-sidenav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Right content */}
        <div className="af-right">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
