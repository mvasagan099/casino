import React, { useState, useEffect } from 'react';
import { 
  Menu, Search, User, Bell, MessageSquare, ChevronDown, ChevronUp,
  Heart, Flame, Gamepad2, Layers, Dices, PlayCircle, 
  Star, Bookmark, Activity, ListFilter, Briefcase, Lock, Home,
  Trophy, Users, LineChart, FileText, Receipt, Settings,
  ShieldCheck, Headphones, LogOut, X, UserPlus
} from 'lucide-react';
import './index.css';
import './sort.css';
import AffiliatePage from './AffiliatePage';
import ReferralPage from './ReferralPage';
import { api } from './api/client';
import VaultModal from './VaultModal';
import TransactionsPage from './TransactionsPage';
import MyBetsPage from './MyBetsPage';
import SettingsPage from './SettingsPage';
import WalletModal from './WalletModal';
import SupportChatModal from './SupportChatModal';
import SavedGamesPage from './SavedGamesPage';
import GamesForYouPage from './GamesForYouPage';
import NewReleasesPage from './NewReleasesPage';
import OnlyOnKingsPage from './OnlyOnKingsPage';
import ContinuePlayingPage from './ContinuePlayingPage';
import LiveBetsTable from './LiveBetsTable';
import SlotsPage from './SlotsPage';
import MinesGame from './MinesGame';
import BlackjackGame from './BlackjackGame';
import DiceGame from './DiceGame';
import LimboGame from './LimboGame';
import PlinkoGame from './PlinkoGame';
import KenoGame from './KenoGame';
import ChickenGame from './ChickenGame';
import CrashGame from './CrashGame';
import HiloGame from './HiloGame';
import MolesGame from './MolesGame';
import FlipGame from './FlipGame';
import WheelGame from './WheelGame';
import PumpGame from './PumpGame';
import RpsGame from './RpsGame';
import DiamondsGame from './DiamondsGame';
import SlideGame from './SlideGame';
import DartsGame from './DartsGame';
import PrimeDiceGame from './PrimeDiceGame';
import DrillGame from './DrillGame';
import BarsGame from './BarsGame';
import AuthModal from './AuthModal';
import AdminPage from './AdminPage';
import { useAuth } from './context/AuthContext';
import { useWallet } from './context/WalletContext';
import toast, { Toaster } from 'react-hot-toast';
import crashCardImage from './assets/crash-card.jpg';
import plinkoCardImage from './assets/plinko-card.png';
import diceCardImage from './assets/dice-card.jpg';
import minesCardImage from './assets/mines-card.jpg';
import limboCardImage from './assets/limbo-card.png';
import barsCardImage from './assets/bars-card.png';
import drillCardImage from './assets/drill-card.png';
import primediceCardImage from './assets/primedice-card.png';
import dartsCardImage from './assets/darts-card.png';
import slideCardImage from './assets/slide-card.png';
import diamondsCardImage from './assets/diamonds-card.png';
import rpsCardImage from './assets/rps-card.png';
import pumpCardImage from './assets/pump-card.png';
import wheelCardImage from './assets/wheel-card.png';
import flipCardImage from './assets/flip-card.png';
import molesCardImage from './assets/moles-card.png';
import hiloCardImage from './assets/hilo-card.png';
import chickenCardImage from './assets/chicken-card.png';
import kenoCardImage from './assets/keno-card.png';
import blackjackCardImage from './assets/blackjack-card.png';

const games = [
  { id: 1, name: 'CRASH', bg: '#00e701', image: '📈', coverImg: crashCardImage },
  { id: 2, name: 'MINES', bg: '#0070FF', image: '💎', coverImg: minesCardImage },
  { id: 3, name: 'DICE', bg: '#8B29FF', image: '🎲', coverImg: diceCardImage },
  { id: 4, name: 'LIMBO', bg: '#FF9900', image: '🚀', coverImg: limboCardImage },
  { id: 5, name: 'PLINKO', bg: '#D22BFF', image: '🎯', coverImg: plinkoCardImage },
  { id: 6, name: 'BLACKJACK', bg: '#FF2A2A', image: '🃏', coverImg: blackjackCardImage },
  { id: 7, name: 'KENO', bg: '#00A3FF', image: '🔢', coverImg: kenoCardImage },
  { id: 8, name: 'CHICKEN', bg: '#5B4BFF', image: '🐔', coverImg: chickenCardImage },
  { id: 9, name: 'HILO', bg: '#00e701', image: '🃏', coverImg: hiloCardImage },
  { id: 10, name: 'MOLES', bg: '#ffb800', image: '🐹', coverImg: molesCardImage },
  { id: 11, name: 'FLIP', bg: '#5b4bff', image: '💲', coverImg: flipCardImage },
  { id: 12, name: 'WHEEL', bg: '#1475e1', image: '🎡', coverImg: wheelCardImage },
  { id: 13, name: 'PUMP', bg: '#0070FF', image: '🎈', coverImg: pumpCardImage },
  { id: 14, name: 'RPS', bg: '#1a2c38', image: '✌️', coverImg: rpsCardImage },
  { id: 15, name: 'DIAMONDS', bg: '#9b59b6', image: '💎', coverImg: diamondsCardImage },
  { id: 16, name: 'SLIDE', bg: '#213743', image: '🎚️', coverImg: slideCardImage },
  { id: 17, name: 'DARTS', bg: '#e74c3c', image: '🎯', coverImg: dartsCardImage },
  { id: 18, name: 'PRIME DICE', bg: '#00e701', image: '🎲', coverImg: primediceCardImage },
  { id: 19, name: 'DRILL', bg: '#16242e', image: '⛏️', coverImg: drillCardImage },
  { id: 20, name: 'BARS', bg: '#0070FF', image: '🍫', coverImg: barsCardImage },
];

function App() {
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  const { user, logout } = useAuth();
  const { balance } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterBy, setFilterBy] = useState('popular');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') || 'home';
  });
  const [savedGames, setSavedGames] = useState([]);
  
  // Initialize saved games when user logs in (Option B: merge local guest games with user's saved games)
  useEffect(() => {
    if (user && user.savedGames) {
      setSavedGames(prev => {
        const merged = Array.from(new Set([...prev, ...user.savedGames]));
        // If the local state had unsaved games before login, sync them up to backend
        if (merged.length > user.savedGames.length) {
          api.put('/auth/saved-games', { savedGames: merged }).catch(console.error);
        }
        return merged;
      });
    } else if (!user) {
      setSavedGames([]);
    }
  }, [user]);

  const toggleSaveGame = (id) => {
    setSavedGames(p => {
      const next = p.includes(id) ? p.filter(x => x !== id) : [...p, id];
      if (user) {
        api.put('/auth/saved-games', { savedGames: next }).catch(console.error);
      }
      return next;
    });
  };
  
  const [playedGames, setPlayedGames] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTo(0, 0);
    window.scrollTo(0, 0);

    // Sync state to URL for history
    const urlParams = new URLSearchParams(window.location.search);
    const urlPage = urlParams.get('page') || 'home';
    if (urlPage !== currentPage) {
      const url = new URL(window.location.href);
      url.searchParams.set('page', currentPage);
      window.history.pushState({ page: currentPage }, '', url.toString());
    }

    const gamePaths = ['mines', 'blackjack', 'dice', 'limbo', 'plinko', 'keno', 'chicken', 'crash', 'hilo', 'moles', 'flip', 'wheel', 'pump', 'rps', 'diamonds', 'slide', 'darts', 'primedice', 'drill', 'bars'];
    if (gamePaths.includes(currentPage)) {
      const gameObj = games.find(g => g.name.toLowerCase().replace(' ', '') === currentPage);
      if (gameObj) {
        document.title = `${gameObj.name} - Casino`;
        setPlayedGames(prev => {
          const filtered = prev.filter(id => id !== gameObj.id);
          return [gameObj.id, ...filtered];
        });
      }
    } else {
      let pageTitle = currentPage.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (pageTitle === 'Home') pageTitle = 'Casino';
      document.title = `${pageTitle} - Casino`;
    }
  }, [currentPage]);

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page') || 'home';
      const modal = urlParams.get('modal');
      setCurrentPage(page);
      
      // Sync modals with URL
      setIsMobileMenuOpen(modal === 'menu');
      setIsAuthOpen(modal === 'auth');
      setIsWalletOpen(modal === 'wallet');
      setIsVaultOpen(modal === 'vault');
      setIsSupportOpen(modal === 'support');
      
      // Close dropdowns
      setIsCurrencyDropdownOpen(false);
      setIsUserDropdownOpen(false);
      setIsSortOpen(false);
      setIsFilterOpen(false);
      setIsLogoutConfirmOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    
    // Set initial URL state on mount if missing
    if (!window.location.search.includes('page=')) {
       const url = new URL(window.location.href);
       url.searchParams.set('page', currentPage);
       window.history.replaceState({ page: currentPage }, '', url.toString());
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update History when a modal opens or closes
  useEffect(() => {
    const activeModal = isAuthOpen ? 'auth' : 
                        isWalletOpen ? 'wallet' : 
                        isVaultOpen ? 'vault' : 
                        isSupportOpen ? 'support' : 
                        isMobileMenuOpen ? 'menu' : null;

    const urlParams = new URLSearchParams(window.location.search);
    const currentModal = urlParams.get('modal');

    if (activeModal && activeModal !== currentModal) {
      const url = new URL(window.location.href);
      url.searchParams.set('modal', activeModal);
      window.history.pushState({ page: currentPage, modal: activeModal }, '', url.toString());
    } else if (!activeModal && currentModal) {
      // User closed the modal manually, remove it from URL without adding to history
      const url = new URL(window.location.href);
      url.searchParams.delete('modal');
      window.history.replaceState({ page: currentPage }, '', url.toString());
    }
  }, [isAuthOpen, isWalletOpen, isVaultOpen, isSupportOpen, isMobileMenuOpen, currentPage]);

  return (
    <div className="app-container">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1a2c38',
            color: '#fff',
            border: '1px solid #2a4156'
          }
        }} 
      />
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && <div className="mobile-sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

      {/* Sidebar - Visible on all pages, supports collapse state */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
          <Menu className="menu-icon" size={24} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
          <div className="toggle-group">
            <button className="toggle-btn casino active" style={{ background: 'linear-gradient(90deg, #00FF87 0%, #00CC6A 100%)', color: '#000', fontWeight: '900', border: 'none', boxShadow: '0 0 15px rgba(0,255,135,0.5)', borderRadius: '20px', height: '40px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 135, 0.7)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,135,0.5)'; }}>Casino</button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${currentPage === 'saved-games' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('saved-games'); setIsMobileMenuOpen(false); }}>
            <Bookmark />
            <span>Saved Games</span>
          </a>
          <a href="#" className={`nav-item ${currentPage === 'continue-playing' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('continue-playing'); setIsMobileMenuOpen(false); }}>
            <PlayCircle />
            <span>Continue Playing</span>
          </a>
          <a href="#" className={`nav-item ${currentPage === 'games-for-you' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('games-for-you'); setIsMobileMenuOpen(false); }}>
            <Star />
            <span>Games For You</span>
          </a>
          <a href="#" className={`nav-item ${currentPage === 'my-bets' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('my-bets'); setIsMobileMenuOpen(false); }}>
            <Activity />
            <span>My Bets</span>
          </a>

          <div className="nav-section-title">Games</div>
          
          <a href="#" className={`nav-item ${currentPage === 'only-on-kings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('only-on-kings'); setIsMobileMenuOpen(false); }}>
            <Layers />
            <span>Only on Kings</span>
          </a>
          <a href="#" className={`nav-item ${currentPage === 'new-releases' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('new-releases'); setIsMobileMenuOpen(false); }}>
            <Flame />
            <span>New Releases</span>
          </a>
          <a href="#" className={`nav-item ${currentPage === 'slots' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('slots'); setIsMobileMenuOpen(false); }}>
            <Gamepad2 />
            <span>Slots</span>
          </a>
          <a href="#" className={`nav-item ${currentPage === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('home'); setIsMobileMenuOpen(false); }}>
            <Flame color="#00e701" />
            <span>Kings Originals</span>
          </a>
          {user?.role === 'ADMIN' && (
            <a href="#" className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('admin'); setIsMobileMenuOpen(false); }}>
              <ShieldCheck />
              <span>Admin Panel</span>
            </a>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-logo" onClick={() => setCurrentPage('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Kings
          </div>
          
          <div className="header-right">
            {user ? (
              <>
                <div className="wallet-group" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-darker)', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setIsWalletOpen(true)}>
                  <div className="balance-wrapper" style={{ position: 'relative' }}>
                    <div className="balance-dropdown" style={{ backgroundColor: 'transparent', borderRadius: 0, paddingRight: '16px', pointerEvents: 'none' }}>
                      {balance.toFixed(2)} <span className="currency">T</span> 
                    </div>
                  </div>
                  <button className="wallet-btn" style={{ borderRadius: 0, height: '100%', pointerEvents: 'none' }}>Wallet</button>
                </div>
                <Search className="header-icon header-search-icon" size={20} style={{cursor: 'pointer'}} onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('main-search')?.focus(), 100); }} />
                
                <div className="user-menu-wrapper" style={{ position: 'relative' }}>
                  <div 
                    className={`header-icon-wrapper ${isUserDropdownOpen ? 'active' : ''}`}
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  >
                    <User className="header-icon" size={20} />
                  </div>
                  
                  {isUserDropdownOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                    onClick={() => setIsUserDropdownOpen(false)}
                  />
                  <div className="user-popup" style={{ zIndex: 100 }}>
                  <div className="user-popup-arrow"></div>
                  <div className="user-menu-list">
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setIsWalletOpen(true); setIsUserDropdownOpen(false); }}>
                      <Briefcase size={18} /> Wallet
                    </a>
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setCurrentPage('affiliate'); setIsUserDropdownOpen(false); }}>
                      <Users size={18} /> Affiliate
                    </a>
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setCurrentPage('referral'); setIsUserDropdownOpen(false); }} style={{ background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.15) 100%)', borderLeft: '3px solid #FFD700', color: '#FFD700' }}>
                      <UserPlus size={18} /> Referral
                      <span style={{ marginLeft: 'auto', background: '#FFD700', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>NEW</span>
                    </a>
                    <a href="#" className="user-menu-item">
                      <LineChart size={18} /> Statistics
                    </a>
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setCurrentPage('transactions'); setIsUserDropdownOpen(false); }}>
                      <FileText size={18} /> Transactions
                    </a>
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setCurrentPage('my-bets'); setIsUserDropdownOpen(false); }}>
                      <Receipt size={18} /> My Bets
                    </a>
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setCurrentPage('settings'); setIsUserDropdownOpen(false); }}>
                      <Settings size={18} /> Settings
                    </a>
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setIsSupportOpen(true); setIsUserDropdownOpen(false); }}>
                      <Headphones size={18} /> Live Support
                    </a>
                    <a href="#" className="user-menu-item" onClick={(e) => { e.preventDefault(); setIsLogoutConfirmOpen(true); setIsUserDropdownOpen(false); }}>
                      <LogOut size={18} /> Logout
                    </a>
                  </div>
                </div>
                </>
              )}
            </div>

            <Bell className="header-icon" size={20} />
            <MessageSquare className="header-icon header-chat-icon" size={20} onClick={() => setIsSupportOpen(true)} style={{cursor: 'pointer'}} />
            </>
            ) : (
              <>
                <Search className="header-icon header-search-icon" size={20} style={{cursor: 'pointer'}} onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('main-search')?.focus(), 100); }} />
                <button className="login-btn" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}>Sign In</button>
                <button className="wallet-btn" onClick={() => { setAuthMode('register'); setIsAuthOpen(true); }}>Register</button>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)', flex: '1 0 auto' }}>
          {currentPage === 'admin' && <AdminPage />}
          {currentPage === 'referral' && <ReferralPage />}
          {currentPage === 'home' && (
          <div className="page-content">


            {/* Controls */}
            <div className="controls-bar">
              <div className="search-input-wrapper">
                <Search size={18} />
                <input id="main-search" type="text" placeholder="Search Kings.com" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="controls-right">
                <div style={{position: 'relative'}}>
                  <button className="dropdown-btn transparent" onClick={() => setIsSortOpen(!isSortOpen)}>
                    <ListFilter size={18} /> Sort
                  </button>
                  {isSortOpen && (
                    <div className="sort-dropdown">
                      <div className="sort-option" onClick={() => { setSortBy('featured'); setIsSortOpen(false); }}>Featured</div>
                      <div className="sort-option" onClick={() => { setSortBy('a-z'); setIsSortOpen(false); }}>A-Z</div>
                      <div className="sort-option" onClick={() => { setSortBy('z-a'); setIsSortOpen(false); }}>Z-A</div>
                      <div className="sort-option" onClick={() => { setSortBy('date-added'); setIsSortOpen(false); }}>Date Added</div>
                    </div>
                  )}
                </div>
                <div style={{position: 'relative'}}>
                  <button className="dropdown-btn" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                    {filterBy === 'popular' ? 'Popular' : filterBy === 'saved' ? 'Saved Games' : 'Recently Played'} <ChevronDown size={16} />
                  </button>
                  {isFilterOpen && (
                    <div className="sort-dropdown">
                      <div className="sort-option" onClick={() => { setFilterBy('popular'); setIsFilterOpen(false); }}>Popular</div>
                      <div className="sort-option" onClick={() => { setFilterBy('saved'); setIsFilterOpen(false); }}>Saved Games</div>
                      <div className="sort-option" onClick={() => { setFilterBy('recent'); setIsFilterOpen(false); }}>Recently Played</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Game Grid */}
            <div className="game-grid">
              {(() => {
                let sorted = games.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (sortBy === 'a-z') sorted.sort((a, b) => a.name.localeCompare(b.name));
                else if (sortBy === 'z-a') sorted.sort((a, b) => b.name.localeCompare(a.name));
                else if (sortBy === 'date-added') sorted.sort((a, b) => b.id - a.id);
                
                if (filterBy === 'saved') {
                  sorted.sort((a, b) => {
                    const aSaved = savedGames.includes(a.id);
                    const bSaved = savedGames.includes(b.id);
                    if (aSaved && !bSaved) return -1;
                    if (!aSaved && bSaved) return 1;
                    return 0;
                  });
                } else if (filterBy === 'recent') {
                  sorted.sort((a, b) => {
                    const aPlayed = playedGames.includes(a.id);
                    const bPlayed = playedGames.includes(b.id);
                    if (aPlayed && !bPlayed) return -1;
                    if (!aPlayed && bPlayed) return 1;
                    return 0;
                  });
                }

                return sorted.map(game => (
                  <div
                    key={game.id}
                  className="game-card"
                  style={{ 
                    backgroundColor: game.coverImg ? 'transparent' : game.bg, 
                    backgroundImage: game.coverImg ? `url(${game.coverImg})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer', 
                    position: 'relative' 
                  }}
                  onClick={() => {
                    if (game.name === 'MINES') setCurrentPage('mines');
                    if (game.name === 'BLACKJACK') setCurrentPage('blackjack');
                    if (game.name === 'DICE') setCurrentPage('dice');
                    if (game.name === 'LIMBO') setCurrentPage('limbo');
                    if (game.name === 'PLINKO') setCurrentPage('plinko');
                    if (game.name === 'KENO') setCurrentPage('keno');
                    if (game.name === 'CHICKEN') setCurrentPage('chicken');
                    if (game.name === 'CRASH') setCurrentPage('crash');
                    if (game.name === 'HILO') setCurrentPage('hilo');
                    if (game.name === 'MOLES') setCurrentPage('moles');
                    if (game.name === 'FLIP') setCurrentPage('flip');
                    if (game.name === 'WHEEL') setCurrentPage('wheel');
                    if (game.name === 'PUMP') setCurrentPage('pump');
                    if (game.name === 'RPS') setCurrentPage('rps');
                    if (game.name === 'DIAMONDS') setCurrentPage('diamonds');
                    if (game.name === 'SLIDE') setCurrentPage('slide');
                    if (game.name === 'DARTS') setCurrentPage('darts');
                    if (game.name === 'PRIME DICE') setCurrentPage('primedice');
                    if (game.name === 'DRILL') setCurrentPage('drill');
                    if (game.name === 'BARS') setCurrentPage('bars');
                  }}
                >
                  <div 
                    className="game-card-save"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveGame(game.id);
                    }}
                    style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, color: 'white', opacity: 0.8 }}
                  >
                    <Bookmark size={20} fill={savedGames.includes(game.id) ? "white" : "none"} />
                  </div>
                  {!game.coverImg && (
                    <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '64px', zIndex: 1}}>
                      {game.image}
                    </div>
                  )}
                  <div className="game-card-title">{game.name}</div>
                  <div className="game-card-subtitle">Kings Originals</div>
                </div>
                ));
              })()}
            </div>
          </div>
        )}

        {currentPage === 'affiliate' && <AffiliatePage />}
        {currentPage === 'transactions' && <TransactionsPage onClose={() => setCurrentPage('home')} />}
        {currentPage === 'my-bets' && <MyBetsPage onClose={() => setCurrentPage('home')} />}
        {currentPage === 'settings' && <SettingsPage onClose={() => setCurrentPage('home')} />}
        {currentPage === 'slots' && <SlotsPage games={games} setCurrentPage={setCurrentPage} savedGames={savedGames} toggleSaveGame={toggleSaveGame} />}
        {currentPage === 'saved-games' && <SavedGamesPage games={games} savedGames={savedGames} setCurrentPage={setCurrentPage} toggleSaveGame={toggleSaveGame} />}
        {currentPage === 'games-for-you' && <GamesForYouPage games={games} savedGames={savedGames} setCurrentPage={setCurrentPage} toggleSaveGame={toggleSaveGame} />}
        {currentPage === 'new-releases' && <NewReleasesPage games={games} savedGames={savedGames} setCurrentPage={setCurrentPage} toggleSaveGame={toggleSaveGame} />}
        {currentPage === 'only-on-kings' && <OnlyOnKingsPage games={games} savedGames={savedGames} setCurrentPage={setCurrentPage} toggleSaveGame={toggleSaveGame} />}
        {currentPage === 'continue-playing' && <ContinuePlayingPage games={games} playedGames={playedGames} savedGames={savedGames} setCurrentPage={setCurrentPage} toggleSaveGame={toggleSaveGame} />}
        {currentPage === 'mines' && <MinesGame />}
        {currentPage === 'blackjack' && <BlackjackGame />}
        {currentPage === 'dice' && <DiceGame />}
        {currentPage === 'limbo' && <LimboGame />}
        {currentPage === 'plinko' && <PlinkoGame />}
        {currentPage === 'keno' && <KenoGame />}
        {currentPage === 'chicken' && <ChickenGame />}
        {currentPage === 'crash' && <CrashGame />}
        {currentPage === 'hilo' && <HiloGame />}
        {currentPage === 'moles' && <MolesGame />}
        {currentPage === 'flip' && <FlipGame />}
        {currentPage === 'wheel' && <WheelGame />}
        {currentPage === 'pump' && <PumpGame />}
        {currentPage === 'rps' && <RpsGame />}
        {currentPage === 'diamonds' && <DiamondsGame />}
        {currentPage === 'slide' && <SlideGame />}
        {currentPage === 'darts' && <DartsGame />}
        {currentPage === 'primedice' && <PrimeDiceGame />}
        {currentPage === 'drill' && <DrillGame />}
        {currentPage === 'bars' && <BarsGame />}
        </div>
        <LiveBetsTable />
      </main>
        
      {/* Logout Confirm Modal */}
      {isLogoutConfirmOpen && (
        <div className="auth-overlay" onClick={() => setIsLogoutConfirmOpen(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-header">
              <div className="auth-title">Confirm Logout</div>
              <button className="auth-close-btn" onClick={() => setIsLogoutConfirmOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="auth-body" style={{ padding: '24px' }}>
              <p style={{ color: '#b0bec5', marginBottom: '24px', textAlign: 'center', fontSize: '15px' }}>Are you sure you want to log out of your account?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="auth-submit-btn" 
                  style={{ background: '#2a4156', color: '#fff', flex: 1 }} 
                  onClick={() => setIsLogoutConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="auth-submit-btn" 
                  style={{ background: '#ef4444', flex: 1 }} 
                  onClick={() => { logout(); setIsLogoutConfirmOpen(false); toast.success('Successfully logged out!'); }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVaultOpen && <VaultModal onClose={() => setIsVaultOpen(false)} />}
      {isSupportOpen && <SupportChatModal onClose={() => setIsSupportOpen(false)} />}
      {isAuthOpen && <AuthModal initialMode={authMode} onClose={() => setIsAuthOpen(false)} />}
      {isWalletOpen && <WalletModal onClose={() => setIsWalletOpen(false)} />}

      {/* Mobile Bottom Bar */}
      <div className="mobile-bottom-bar">
        <div className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu size={20} />
          <span>Menu</span>
        </div>
        <div className="mobile-nav-item" onClick={() => { setCurrentPage('home'); setIsMobileMenuOpen(false); }}>
          <Home size={20} />
          <span>Home</span>
        </div>
        <div className="mobile-nav-item" onClick={() => { setCurrentPage('saved-games'); setIsMobileMenuOpen(false); }}>
          <Bookmark size={20} />
          <span>Saved</span>
        </div>
        <div className="mobile-nav-item" onClick={() => setIsSupportOpen(true)}>
          <MessageSquare size={20} />
          <span>Chat</span>
        </div>
      </div>
    </div>
  );
}

export default App;
