import React from 'react';
import { Bookmark } from 'lucide-react';

export default function SavedGamesPage({ savedGames, games, setCurrentPage, toggleSaveGame }) {
  const savedList = games.filter(g => savedGames.includes(g.id));

  return (
    <div className="slots-page">
      <div className="slots-page-inner">
        <h2 style={{ color: 'white', marginBottom: '16px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bookmark size={24} fill="white" /> Saved Games
        </h2>
        {savedList.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '16px' }}>You haven't saved any games yet.</div>
        ) : (
          <div className="game-grid">
            {savedList.map(game => (
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
                  <Bookmark size={20} fill="white" />
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
