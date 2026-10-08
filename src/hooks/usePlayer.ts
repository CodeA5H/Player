import { useState, useEffect } from 'react';
import { playerService } from '../services/youtubePlayer';
import type { PlayerState } from '../services/youtubePlayer';
import { config } from '../config/config';

export function usePlayer() {
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    isMuted: false,
    isShuffle: false,
    isRepeat: false,
    currentVideoIndex: 0,
    playlist: [],
    currentVideoData: null,
    isReady: false,
    currentPlaylistId: config.playlists?.[0]?.id || config.youtubePlaylistId,
    playingPlaylistId: config.playlists?.[0]?.id || config.youtubePlaylistId,
    playingPlaylist: [],
    fetchingPlaylists: [],
  });

  useEffect(() => {
    const unsubscribe = playerService.subscribe((newState) => {
      setState((prev) => ({ ...prev, ...newState }));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    play: playerService.play,
    pause: playerService.pause,
    next: playerService.next,
    previous: playerService.previous,
    seekTo: playerService.seekTo,
    setVolume: playerService.setVolume,
    toggleMute: playerService.toggleMute,
    toggleShuffle: playerService.toggleShuffle,
    toggleRepeat: playerService.toggleRepeat,
    playPlaylistItem: playerService.playPlaylistItem,
    loadPlaylist: playerService.loadPlaylist,
  };
}
