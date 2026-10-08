import { useState, useEffect } from 'react';
import { config } from '../config/config';

export type SavedPlaylist = {
  id: string;
  name: string;
};

const STORAGE_KEY = 'my_radio_saved_playlists';

export function useSavedPlaylists() {
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let parsed: SavedPlaylist[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {
        // Ignore JSON error
      }
    }
    
    // Always ensure config playlists are present
    const defaultIds = config.playlists?.map((p: any) => p.id) || [];
    const customPlaylists = parsed.filter((p: any) => !defaultIds.includes(p.id));
    return [...(config.playlists || []), ...customPlaylists];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  const addPlaylist = (id: string, name: string) => {
    if (!id.trim()) return;
    
    let finalId = id.trim();
    if (finalId.includes('list=')) {
      const match = finalId.match(/list=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        finalId = match[1];
      }
    } else {
      const vidMatch = finalId.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (vidMatch && vidMatch[1]) {
        finalId = vidMatch[1];
      }
    }

    if (playlists.some((p: any) => p.id === finalId)) return; // Already exists

    const newPlaylist = {
      id: finalId,
      name: name.trim() || `Playlist ${playlists.length + 1}`,
    };

    setPlaylists([...playlists, newPlaylist]);
  };

  const removePlaylist = (id: string) => {
    // Prevent removing default config playlists
    if (config.playlists?.some((p: any) => p.id === id)) return;
    setPlaylists(playlists.filter((p: any) => p.id !== id));
  };

  return {
    playlists,
    addPlaylist,
    removePlaylist
  };
}
