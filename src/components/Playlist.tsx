import React from 'react';
import { usePlayer } from '../hooks/usePlayer';

const Playlist: React.FC = () => {
  const { playlist, currentVideoIndex, playPlaylistItem, isReady, currentPlaylistId, playingPlaylistId, fetchingPlaylists } = usePlayer();

  if (!isReady || fetchingPlaylists.includes(currentPlaylistId)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-secondary animate-pulse text-sm">Loading playlist...</div>
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-2 p-4 text-center">
        <div className="text-secondary/80 text-sm">Playlist is empty or unavailable</div>
        <div className="text-secondary/50 text-[11px]">This might happen if the playlist is private or has no videos.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-4">
      {playlist.map((item, index) => {
        const isActive = index === currentVideoIndex && currentPlaylistId === playingPlaylistId;
        
        return (
          <div 
            key={`${item.videoId}-${index}`}
            onClick={() => playPlaylistItem(index)}
            className="group flex items-start cursor-pointer"
          >
            <div className={`w-8 pt-0.5 flex-shrink-0 text-[10px] font-mono transition-colors ${isActive ? 'text-highlight' : 'text-secondary/50 group-hover:text-primary/70'}`}>
              {(index + 1).toString().padStart(2, '0')}
            </div>
            
            <div className="flex-1 min-w-0 pr-4 flex flex-col">
              <span className={`text-sm tracking-wide transition-colors leading-snug ${isActive ? 'text-highlight font-medium' : 'text-primary/80 group-hover:text-primary'}`}>
                {item.title}
              </span>
              <span className="text-xs text-secondary/60 mt-1 truncate">
                {item.author}
              </span>
            </div>
            
            {item.duration && (
              <div className="text-[10px] font-mono text-secondary/40 group-hover:text-secondary/80 transition-colors pt-0.5">
                {item.duration}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Playlist;
