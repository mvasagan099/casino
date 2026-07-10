import React, { useMemo } from 'react';
import { Flame, Bookmark } from 'lucide-react';

export default function NewReleasesPage({ games, setCurrentPage, savedGames = [], toggleSaveGame = () => {} }) {
  const randomGames = useMemo(() => {
    return [...games].sort(() => 0.5 - Math.random()).slice(0, 10);
  }, [games]);

  return (
    <div className="slots-page" style={{ flex: 1, padding: '32px 32px 0 32px' }}>
      <div className="slots-page-inner">
        <h2 style={{ color: 'white', marginBottom: '24px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={24} fill="#FF9900" color="#FF9900" /> New Releases
        </h2>
        
        <div className="game-grid">
          {randomGames.map(game => (
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
      </div>
    </div>
  );
}
