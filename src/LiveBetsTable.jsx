import React, { useState, useEffect } from 'react';
import { Trophy, User, Filter, ChevronDown, Activity } from 'lucide-react';
import { useSocket } from './context/SocketContext';
import { useAuth } from './context/AuthContext';
import { api } from './api/client';
import './slots.css';

export default function LiveBetsTable() {
  const [activeTab, setActiveTab] = useState('My Bets');
  const { socket } = useSocket();
  const { user } = useAuth();
  const [liveBets, setLiveBets] = useState([]);

  const myBetsData = [
    { game: 'Dice', time: '12:53 PM', amount: '0.00000000', curr: 'T', mult: '2.00×', payout: '0.00000000', curr2: 'T', positive: true },
    { game: 'Flip', time: '12:53 PM', amount: '0.00000000', curr: 'T', mult: '0.00×', payout: '0.00000000', curr2: 'T', positive: false },
    { game: 'Moles', time: '12:52 PM', amount: '0.00000000', curr: 'T', mult: '0.00×', payout: '0.00000000', curr2: 'T', positive: false },
    { game: 'Moles', time: '12:52 PM', amount: '0.00000000', curr: 'T', mult: '0.00×', payout: '0.00000000', curr2: 'T', positive: false },
    { game: 'Moles', time: '12:51 PM', amount: '0.00000000', curr: 'T', mult: '2.29×', payout: '0.00000000', curr2: 'T', positive: true },
    { game: 'Crash', time: '12:45 PM', amount: '0.00000000', curr: 'T', mult: '0.00×', payout: '0.00000000', curr2: 'T', positive: false },
    { game: 'Chicken', time: '12:43 PM', amount: '0.00000000', curr: 'T', mult: '0.00×', payout: '0.00000000', curr2: 'T', positive: false },
    { game: 'Chicken', time: '12:43 PM', amount: '0.00000000', curr: 'T', mult: '0.00×', payout: '0.00000000', curr2: 'T', positive: false },
  ];

  const allBetsData = [
    { game: 'Mines', user: 'Nahal739', time: '3:08 PM', amount: '100.00000000', curr: 'T', mult: '1.71×', payout: '171.20300752', curr2: 'T', positive: true },
    { game: 'Gates of Olympu...', user: 'Hidden', hidden: true, time: '3:08 PM', amount: '0.18434999', curr: 'Ξ', mult: '0.00×', payout: '-0.18434999', curr2: 'Ξ', positive: false },
    { game: 'Blackjack', user: 'Hidden', hidden: true, time: '3:08 PM', amount: 'CA$20.48', curr: '🇨🇦', mult: '0.00×', payout: '-CA$20.48', curr2: '🇨🇦', positive: false },
    { game: 'Mines', user: 'Storm92LioN', time: '3:08 PM', amount: '1.22100000', curr: 'T', mult: '1.08×', payout: '1.31390217', curr2: 'T', positive: true },
    { game: '40 Burning Hot B...', user: 'Bursa1655', time: '3:08 PM', amount: 'TRY 500.00', curr: '🇹🇷', mult: '0.00×', payout: '-TRY 500.00', curr2: '🇹🇷', positive: false },
    { game: 'Waylanders Forge', user: 'Xue123', time: '3:08 PM', amount: '40.03999996', curr: 'T', mult: '0.00×', payout: '-40.03999996', curr2: 'T', positive: false },
    { game: 'The Dog House ...', user: 'Chindian5220', time: '3:08 PM', amount: 'CA$50.00', curr: '🇨🇦', mult: '0.00×', payout: '-CA$50.00', curr2: '🇨🇦', positive: false },
    { game: 'The Dog House', user: 'dochkabochka', time: '3:08 PM', amount: '1,373,480.47...', curr: '🐕', mult: '7.40×', payout: '10,163,755.4...', curr2: '🐕', positive: true },
  ];

  const highRollersData = [
    { game: 'Fruit Party', user: 'Hidden', hidden: true, time: '3:08 PM', amount: 'CA$1,000.00', curr: '🇨🇦', mult: '4.61×', payout: 'CA$4,612.00', curr2: '🇨🇦', positive: true },
    { game: 'Odinfall', user: 'theoutlaw', time: '3:08 PM', amount: '0.01671650', curr: '₿', mult: '0.00×', payout: '-0.01671650', curr2: '₿', positive: false },
    { game: 'Salon Privé Black...', user: 'Hidden', hidden: true, time: '3:08 PM', amount: '8,007.999991...', curr: 'T', mult: '1.50×', payout: '12,011.99998...', curr2: 'T', positive: true },
    { game: 'Mines', user: 'Hidden', hidden: true, time: '3:08 PM', amount: 'CA$4,000.00', curr: '🇨🇦', mult: '0.00×', payout: '-CA$4,000.00', curr2: '🇨🇦', positive: false },
    { game: 'Dynasty Speed B...', user: 'abc810830', time: '3:08 PM', amount: '2,001.999998...', curr: 'T', mult: '0.00×', payout: '-2,001.99999...', curr2: 'T', positive: false },
    { game: 'Wanted Dead or ...', user: 'boss61', time: '3:08 PM', amount: '10.68527859', curr: 'T', mult: '372.00×', payout: '3,974.923636...', curr2: 'T', positive: true },
    { game: 'Sticky Sweets', user: 'Hidden', hidden: true, time: '3:08 PM', amount: '1,342.337154...', curr: 'T', mult: '0.55×', payout: '-598.2349253...', curr2: 'T', positive: false },
    { game: 'Kill Switch', user: 'Hidden', hidden: true, time: '3:08 PM', amount: '360.35999964', curr: 'T', mult: '16.72×', payout: '6,024.618593...', curr2: 'T', positive: true },
  ];

  const raceLeaderboard = [
    { rank: 1, user: 'Hidden', hidden: true, wagered: '$20,993,078.20', prize: '$25,000.00' },
    { rank: 2, user: 'Hidden', hidden: true, wagered: '$20,776,271.65', prize: '$12,000.00' },
    { rank: 3, user: 'Hidden', hidden: true, wagered: '$15,513,874.60', prize: '$8,000.00' },
    { rank: 4, user: 'Hidden', hidden: true, wagered: '$12,894,594.49', prize: '$6,000.00' },
    { rank: 5, user: 'DeepPockets6', wagered: '$12,040,800.00', prize: '$5,000.00' },
    { rank: 6, user: 'Hidden', hidden: true, wagered: '$11,587,741.39', prize: '$3,500.00' },
  ];

  useEffect(() => {
    if (!socket) return;
    
    const handleNewBet = (bet) => {
      setLiveBets(prev => [bet, ...prev].slice(0, 8));
    };
    
    socket.on('bet:placed', handleNewBet);
    return () => socket.off('bet:placed', handleNewBet);
  }, [socket]);

  useEffect(() => {
    api.get('/games/history')
      .then(res => {
        if (res.data && res.data.success) {
          setLiveBets(res.data.data);
        }
      })
      .catch(console.error);
  }, []);

  const getActiveData = () => {
    if (activeTab === 'My Bets') {
      return user ? liveBets.filter(b => b.user === user.username).slice(0, 8) : [];
    }
    if (activeTab === 'All Bets') {
      return liveBets.slice(0, 8);
    }
    if (activeTab === 'High Rollers') {
      return liveBets.filter(b => parseFloat(b.amount) >= 100).slice(0, 8);
    }
    return [];
  };

  return (
    <div style={{ padding: '48px 32px 32px 32px' }}>
      <div className="my-bets-header">
        <div className="my-bets-tabs">
          {['My Bets', 'All Bets', 'High Rollers', 'Race Leaderboard'].map(tab => (
            <button 
              key={tab} 
              className={`my-bets-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="my-bets-controls">
          <button className="my-bets-control-btn"><Filter size={16} /></button>
          <button className="my-bets-control-btn" style={{ width: 'auto', gap: '8px', padding: '0 12px' }}>
            8 <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {activeTab === 'Race Leaderboard' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a2c38', padding: '16px 24px', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <Trophy size={16} color="var(--text-muted)" /> $100k Race
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
            <Activity size={16} /> Ends in 5 hours
          </div>
        </div>
      )}

      <div className="table-container" style={{ borderTopLeftRadius: activeTab === 'Race Leaderboard' ? '0' : '4px', borderTopRightRadius: activeTab === 'Race Leaderboard' ? '0' : '4px' }}>
        <table className="bets-table">
          <thead>
            {activeTab === 'Race Leaderboard' ? (
              <tr>
                <th>User</th>
                <th style={{ textAlign: 'right' }}><Trophy size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/> Wagered</th>
                <th style={{ textAlign: 'right' }}>Prize</th>
              </tr>
            ) : (
              <tr>
                <th>Game</th>
                {(activeTab === 'All Bets' || activeTab === 'High Rollers') && <th>User</th>}
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Bet Amount</th>
                <th style={{ textAlign: 'right' }}>Multiplier</th>
                <th style={{ textAlign: 'right' }}>Payout</th>
              </tr>
            )}
          </thead>
          <tbody>
            {activeTab === 'Race Leaderboard' ? (
              raceLeaderboard.map((row, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        color: row.rank === 1 ? '#F1C40F' : row.rank === 2 ? '#3498DB' : row.rank === 3 ? '#E67E22' : 'var(--text-muted)',
                        fontWeight: 700 
                      }}>
                        {row.rank <= 3 ? <Trophy size={14} /> : `${row.rank}th`}
                      </span>
                      {row.hidden ? <User size={14} color="var(--text-muted)" /> : null}
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.user}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                    {row.wagered} <span style={{ color: '#00e701', fontSize: '12px' }}>$</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#00e701' }}>
                    {row.prize} <span style={{ fontSize: '12px' }}>$</span>
                  </td>
                </tr>
              ))
            ) : getActiveData().length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'My Bets' ? 5 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No recent bets found.
                </td>
              </tr>
            ) : (
              getActiveData().map((row, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 600 }}>
                      <Activity size={14} color="var(--text-muted)" />
                      {row.game}
                    </div>
                  </td>
                  {(activeTab === 'All Bets' || activeTab === 'High Rollers') && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 600 }}>
                        {row.hidden ? <User size={14} color="var(--text-muted)" /> : null}
                        {row.user}
                      </div>
                    </td>
                  )}
                  <td style={{ color: 'var(--text-muted)' }}>{row.time}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-main)', fontWeight: 600 }}>
                    {row.amount} <span style={{ color: '#00e701', fontSize: '12px', display: 'inline-block', marginLeft: '4px' }}>{row.curr}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-main)', fontWeight: 600 }}>
                    {row.mult}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: row.positive ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {row.payout} <span style={{ fontSize: '12px', display: 'inline-block', marginLeft: '4px' }}>{row.curr2}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
