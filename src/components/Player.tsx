import React, { useEffect } from 'react';
import { playerService } from '../services/youtubePlayer';
import NowPlaying from './NowPlaying';
import Controls from './Controls';
import Playlist from './Playlist';
import Sidebar from './Sidebar';
import { usePlayer } from '../hooks/usePlayer';
import { useSavedPlaylists } from '../hooks/useSavedPlaylists';

const Player: React.FC = () => {
  const { currentPlaylistId, loadPlaylist } = usePlayer();
  const { playlists, addPlaylist, removePlaylist } = useSavedPlaylists();

  useEffect(() => {
    // Initialize the YouTube player with the first playlist if available
    playerService.initialize('youtube-player');
    
    // If we have saved playlists and none is playing yet, load the first one.
    // Wait, the player initializes with the default config ID.
    // We can explicitly load the first saved playlist if the current one isn't in the list
    if (playlists.length > 0 && !playlists.some(p => p.id === currentPlaylistId)) {
       loadPlaylist(playlists[0].id);
    }
  }, []); // Run once on mount

  return (
    <div className="flex h-screen w-screen overflow-hidden text-primary font-sans">
      {/* Hidden YouTube Player Iframe */}
      <div id="youtube-player" className="pointer-events-none absolute -left-[9999px] w-[1px] h-[1px] opacity-0"></div>
      
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full p-6 md:p-12 lg:p-20 gap-12 lg:gap-24 relative z-10">
        
        {/* Column 1: Channels (Sidebar) */}
        <div className="w-full md:w-48 lg:w-56 flex flex-col flex-shrink-0">
          <Sidebar 
            playlists={playlists}
            currentPlaylistId={currentPlaylistId}
            onSelectPlaylist={loadPlaylist}
            onAddPlaylist={addPlaylist}
            onRemovePlaylist={(id) => {
              removePlaylist(id);
              if (id === currentPlaylistId) {
                const fallback = playlists.find(p => p.id !== id);
                if (fallback) loadPlaylist(fallback.id);
              }
            }}
          />
        </div>

        {/* Column 2: Queue */}
        <div className="flex-1 flex flex-col min-w-0 pt-2">
          <div className="text-[10px] tracking-[0.3em] font-medium text-secondary/60 uppercase mb-8">
            Queue
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <Playlist />
          </div>
        </div>
        
        {/* Column 3: Player */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col justify-center flex-shrink-0">
          <NowPlaying />
          <div className="mt-12 w-full">
            <Controls />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Player;
