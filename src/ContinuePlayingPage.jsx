import React from 'react';
import { PlayCircle, Bookmark } from 'lucide-react';

export default function ContinuePlayingPage({ games, playedGames, setCurrentPage, savedGames = [], toggleSaveGame = () => {} }) {
  const historyGames = playedGames.map(id => games.find(g => g.id === id)).filter(Boolean);

  return (
    <div className="slots-page" style={{ padding: '32px 32px 0 32px' }}>
      <div className="slots-page-inner">
        <h2 style={{ color: 'white', marginBottom: '24px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlayCircle size={24} /> Continue Playing
        </h2>
        
        {historyGames.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>You haven't played any games yet.</div>
        ) : (
          <div className="game-grid">
            {historyGames.map(game => (
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
                  const path = game.name.toLowerCase().replace(' ', '');
                  setCurrentPage(path);
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
