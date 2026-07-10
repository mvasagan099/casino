import React, { useState } from 'react';
import { Copy, Users, Gift, Share2 } from 'lucide-react';
import './affiliate.css'; // Reuse affiliate styles for consistency

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('kings.com/r/user123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Kings Casino',
          text: 'Use my referral link to join Kings Casino and let\'s play!',
          url: 'https://kings.com/r/user123',
        });
      } else {
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('Join Kings Casino! https://kings.com/r/user123'), '_blank');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="af-container" style={{ padding: '32px' }}>
      <div className="af-header">
        <h1 className="af-title">Refer a Friend</h1>
      </div>

      <div className="af-content" style={{ marginTop: '20px' }}>
        <div className="af-overview-top">
          <div className="af-overview-info" style={{ flex: 1 }}>
            <h2 className="af-section-title">Invite Friends & Earn Rewards</h2>
            <p className="af-desc">Share your referral link with friends. When they sign up and play, you earn a percentage of the house edge!</p>

            <div className="af-stats-row" style={{ marginTop: '30px' }}>
              <div className="af-stat">
                <strong>0</strong>
                <span>Total Referrals</span>
              </div>
              <div className="af-stat">
                <strong>0.00 T</strong>
                <span>Total Earned</span>
              </div>
              <div className="af-stat">
                <strong>5%</strong>
                <span>Commission Rate</span>
              </div>
            </div>

            <div className="af-link-section" style={{ marginTop: '30px' }}>
              <label>Your Referral Link</label>
              <div className="af-link-input-row">
                <input type="text" readOnly value="kings.com/r/user123" className="af-link-input" />
                <button className="af-copy-btn" onClick={handleCopy}>
                  {copied ? '✓' : <Copy size={16} />}
                </button>
              </div>
            </div>
            
            <button className="af-copy-btn" onClick={handleShare} style={{ marginTop: '20px', width: '100%', padding: '14px', background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)', color: '#000', fontWeight: '900', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: 'none', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', fontSize: '16px' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.6)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)'; }}>
              <Share2 size={20} /> Share on Social Media
            </button>
          </div>
        </div>

        <h3 className="af-advantages-title" style={{ marginTop: '40px' }}>How it works</h3>
        <div className="af-advantages-grid">
          <div className="af-advantage-card">
            <div className="af-adv-icon"><Share2 size={24} /></div>
            <div>
              <div className="af-adv-title">1. Share Your Link</div>
              <div className="af-adv-desc">Send your unique referral link to your friends via text, email, or social media.</div>
            </div>
          </div>
          <div className="af-advantage-card">
            <div className="af-adv-icon"><Users size={24} /></div>
            <div>
              <div className="af-adv-title">2. Friends Join & Play</div>
              <div className="af-adv-desc">Your friends click the link, create a Kings account, and start playing their favorite games.</div>
            </div>
          </div>
          <div className="af-advantage-card">
            <div className="af-adv-icon"><Gift size={24} /></div>
            <div>
              <div className="af-adv-title">3. Earn Rewards</div>
              <div className="af-adv-desc">You earn commission instantly every time your referred friends place a bet, win or lose!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
