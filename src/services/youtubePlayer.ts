/// <reference types="youtube" />
import { config } from '../config/config';
import type { PlaylistItem } from './youtubeData';
import { fetchPlaylistMetadata, fetchTitlesWithNoembed } from './youtubeData';

export type PlayerState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  currentVideoIndex: number;
  playlist: PlaylistItem[];
  currentVideoData: any;
  isReady: boolean;
  currentPlaylistId: string;
  playingPlaylistId: string;
  playingPlaylist: PlaylistItem[];
  fetchingPlaylists: string[];
};

type Listener = (state: PlayerState) => void;

class YoutubePlayerService {
  private player: YT.Player | null = null;
  private playlistCache: Record<string, PlaylistItem[]> = {};
  private videoIdCache: Record<string, string[]> = {};
  // Lock to prevent concurrent iframe modifications
  private isFetching = false;
  private fetchQueue: string[] = [];

  private state: PlayerState = {
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
  };
  private listeners: Set<Listener> = new Set();
  private progressTimer: number | null = null;

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  private updateState(newState: Partial<PlayerState>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  public initialize(elementId: string) {
    if (this.player) return;
    if ((window as any).YT && (window as any).YT.Player) {
      this.initPlayer(elementId);
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      (window as any).onYouTubeIframeAPIReady = () => {
        this.initPlayer(elementId);
      };
    }
  }

  private initPlayer(elementId: string) {
    const startId = this.state.playingPlaylistId;
    this.player = new YT.Player(elementId, {
      playerVars: {
        listType: 'playlist',
        list: startId,
        controls: 0,
        playsinline: 1,
        rel: 0,
        enablejsapi: 1,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        origin: window.location.origin
      },
      events: {
        onReady: this.onPlayerReady,
        onStateChange: this.onPlayerStateChange,
      }
    });
  }

  private onPlayerReady = async (event: YT.PlayerEvent) => {
    const p = event.target as YT.Player;
    this.updateState({
      isReady: true,
      volume: p.getVolume() || 100,
      isMuted: p.isMuted() || false,
    });

    const firstId = this.state.playingPlaylistId;
    console.log('[Player] Startup: waiting for first playlist IDs...');
    
    // Poll the main player for the FIRST playlist's IDs (since it's already loaded)
    const firstIds = await new Promise<string[]>(resolve => {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        const ids = p.getPlaylist() || [];
        if (ids.length > 0) {
          clearInterval(poll);
          resolve(ids);
        } else if (attempts > 120) {
          clearInterval(poll);
          resolve([]);
        }
      }, 250);
    });

    console.log('[Player] First playlist', firstId, '→', firstIds.length, 'IDs');
    
    if (firstIds.length > 0) {
      this.videoIdCache[firstId] = firstIds;
      await this.buildMetadataCache(firstId);
    }

    // Pre-fetch other config playlists in background
    const allPlaylists = config.playlists || [];
    for (const pl of allPlaylists) {
      if (pl.id !== firstId) {
        this.queueFetch(pl.id);
      }
    }

    // Show tracks for the current playlist
    if (this.playlistCache[firstId]) {
      this.updateState({ playlist: this.playlistCache[firstId] });
    }

    this.updateVideoData();
    this.startProgressTimer();
  };

  /**
   * Fetch video IDs by creating a temporary, hidden iframe.
   * This ensures we NEVER interrupt the main player.
   */
  private async stealPlaylistIds(playlistId: string): Promise<void> {
    if (this.videoIdCache[playlistId]?.length > 0) return;

    if (playlistId.length === 11 && !playlistId.startsWith('PL')) {
      this.videoIdCache[playlistId] = [playlistId];
      await this.buildMetadataCache(playlistId);
      return;
    }

    console.log('[Player] Spawning hidden fetcher for', playlistId);
    
    return new Promise((resolve) => {
      const fetcherDiv = document.createElement('div');
      fetcherDiv.id = `yt-fetcher-${playlistId}`;
      fetcherDiv.style.position = 'absolute';
      fetcherDiv.style.left = '-9999px';
      fetcherDiv.style.width = '1px';
      fetcherDiv.style.height = '1px';
      fetcherDiv.style.opacity = '0';
      document.body.appendChild(fetcherDiv);

      let fetcherPlayer: YT.Player | null = null;
      let cleanupDone = false;

      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        try { fetcherPlayer?.destroy(); } catch (e) {}
        try { fetcherDiv.remove(); } catch (e) {}
        resolve();
      };

      if (typeof window.YT === 'undefined' || !window.YT.Player) {
        console.warn('[Player] YT API not ready, delaying hidden fetcher for', playlistId);
        cleanup();
        setTimeout(() => this.queueFetch(playlistId), 1000);
        return;
      }

      // Fallback timeout in case playlist fails to load completely
      const timeout = setTimeout(() => {
        console.warn('[Player] Hidden fetcher timed out for', playlistId);
        cleanup();
      }, 30000); // 30 seconds to allow skipping unembeddable videos

      fetcherPlayer = new YT.Player(fetcherDiv.id, {
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          controls: 0,
          autoplay: 1, // Must autoplay to load the list and skip unembeddable videos
          mute: 1,     // MUST be muted so user doesn't hear it
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            event.target.mute(); // Mute again just in case
            
            // Start polling for IDs
            let attempts = 0;
            const poll = setInterval(async () => {
              attempts++;
              const ids = fetcherPlayer?.getPlaylist() || [];
              if (ids.length > 0) {
                clearInterval(poll);
                clearTimeout(timeout);
                
                this.videoIdCache[playlistId] = ids;
                console.log('[Player] Hidden fetcher got', ids.length, 'IDs for', playlistId);
                
                // Start background metadata fetch without blocking
                this.buildMetadataCache(playlistId);
                
                cleanup();
              } else if (attempts > 120) { // 30 seconds
                clearInterval(poll);
              }
            }, 250);
          },
          onError: (e) => {
            if (cleanupDone) return;
            console.error('[Player] Hidden fetcher error for', playlistId, 'Error code:', e.data);
            // Even if the first video throws an error (e.g. embed disabled), 
            // the playlist might still be loaded in the player.
            const ids = fetcherPlayer?.getPlaylist() || [];
            if (ids.length > 0) {
              console.log('[Player] Recovered', ids.length, 'IDs from errored fetcher for', playlistId);
              clearTimeout(timeout);
              this.videoIdCache[playlistId] = ids;
              this.buildMetadataCache(playlistId);
              cleanup();
            } else {
              // Allow the polling loop to continue for a bit to see if IDs populate
              // The timeout (15s) will eventually clean it up if it stays empty
            }
          }
        }
      });
    });
  }

  /**
   * Build title/author metadata for a playlist from its cached video IDs.
   */
  private async buildMetadataCache(playlistId: string): Promise<void> {
    if (this.playlistCache[playlistId]?.length > 0) return;

    const videoIds = this.videoIdCache[playlistId] || [];
    if (videoIds.length === 0) return;

    const metadata = await fetchPlaylistMetadata(playlistId);
    if (metadata.length > 0) {
      this.playlistCache[playlistId] = metadata;
      if (this.state.currentPlaylistId === playlistId) {
        this.updateState({ playlist: metadata });
      }
      if (this.state.playingPlaylistId === playlistId) {
        this.updateState({ playingPlaylist: metadata });
      }
      return;
    }

    // Placeholder tracks
    const placeholders = videoIds.map((id, i) => ({
      videoId: id, title: `Track ${i + 1}`, author: 'Unknown Artist', duration: '0:00'
    }));
    this.playlistCache[playlistId] = placeholders;
    if (this.state.currentPlaylistId === playlistId) {
      this.updateState({ playlist: placeholders });
    }
    if (this.state.playingPlaylistId === playlistId) {
      this.updateState({ playingPlaylist: placeholders });
    }

    // Background: fetch real titles
    fetchTitlesWithNoembed(videoIds).then(items => {
      if (items?.length > 0) {
        this.playlistCache[playlistId] = items;
        if (this.state.currentPlaylistId === playlistId) {
          this.updateState({ playlist: items });
        }
        if (this.state.playingPlaylistId === playlistId) {
          this.updateState({ playingPlaylist: items });
        }
      }
    });
  }


  // ─── Public API ───────────────────────────────────────────────

  /**
   * Sidebar click: switch which playlist's tracks are SHOWN in the queue.
   * Does NOT touch the iframe or interrupt playback IF we have cached data.
   */
  public loadPlaylist = (playlistId: string) => {
    if (playlistId === this.state.currentPlaylistId) return;

    console.log('[Player] loadPlaylist:', playlistId,
      '| cached?', !!this.playlistCache[playlistId]?.length,
      '| videoIds?', !!this.videoIdCache[playlistId]?.length);

    this.updateState({
      currentPlaylistId: playlistId,
      playlist: this.playlistCache[playlistId] || []
    });

    // If we don't have video IDs for this playlist, queue a fetch
    if (!this.videoIdCache[playlistId]?.length) {
      this.queueFetch(playlistId);
    }
  };

  /**
   * Queue a playlist for background fetching. Only one fetch runs at a time.
   */
  private queueFetch(playlistId: string) {
    if (!this.fetchQueue.includes(playlistId) && !this.videoIdCache[playlistId]) {
      this.fetchQueue.push(playlistId);
      this.updateState({ fetchingPlaylists: [...this.state.fetchingPlaylists, playlistId] });
      if (!this.isFetching) {
        this.processFetchQueue();
      }
    }
  }

  private async processFetchQueue() {
    if (this.isFetching) return;
    this.isFetching = true;

    while (this.fetchQueue.length > 0) {
      const id = this.fetchQueue.shift()!;
      if (this.videoIdCache[id]?.length > 0) {
        this.updateState({ 
          fetchingPlaylists: this.state.fetchingPlaylists.filter((pid: string) => pid !== id) 
        });
        continue;
      }

      console.log('[Player] Fetching playlist (queued):', id);

      // Steal IDs using hidden iframe
      await this.stealPlaylistIds(id);

      this.updateState({ 
        fetchingPlaylists: this.state.fetchingPlaylists.filter((pid: string) => pid !== id) 
      });

      // Show tracks if user is still viewing this playlist
      if (this.state.currentPlaylistId === id && this.playlistCache[id]) {
        this.updateState({ playlist: this.playlistCache[id] });
      }
    }

    this.isFetching = false;
  }

  /**
   * User clicked a track in the queue.
   */
  public playPlaylistItem = (index: number) => {
    if (!this.player) return;
    const viewingId = this.state.currentPlaylistId;
    const playingId = this.state.playingPlaylistId;

    console.log('[Player] playPlaylistItem:', index,
      '| viewing:', viewingId,
      '| playing:', playingId,
      '| same?', viewingId === playingId);

    if (viewingId === playingId) {
      // Same playlist in iframe — just jump to track
      this.player.playVideoAt(index);
    } else {
      // Different playlist — explicitly load the cached video IDs
      const videoIds = this.videoIdCache[viewingId];
      if (!videoIds || videoIds.length === 0) {
        console.error('[Player] ERROR: No video IDs cached for', viewingId);
        return;
      }

      console.log('[Player] → Switching iframe to video array of length', videoIds.length, 'at index', index);
      
      this.updateState({ 
        playingPlaylistId: viewingId, 
        currentVideoIndex: index,
        playingPlaylist: this.playlistCache[viewingId] || []
      });

      // We explicitly load the ARRAY of video IDs. This is 100% deterministic
      // and bypasses YouTube's buggy native playlist resolution during playback.
      this.player.loadPlaylist(videoIds, index);

      // Verify the switch worked after a delay
      setTimeout(() => {
        const data = (this.player as any)?.getVideoData?.();
        const iframeIds = this.player?.getPlaylist() || [];
        console.log('[Player] → VERIFY: now playing', data?.title,
          '| iframe has', iframeIds.length, 'videos');
      }, 2000);
    }
  };

  // ─── Player events ────────────────────────────────────────────

  private onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
    const isPlaying = event.data === YT.PlayerState.PLAYING;
    this.updateState({ isPlaying });

    if (isPlaying || event.data === YT.PlayerState.UNSTARTED || event.data === YT.PlayerState.CUED) {
      this.updateVideoData();
    }
  };

  private updateVideoData = () => {
    if (!this.player) return;
    const index = this.player.getPlaylistIndex() || 0;
    const data = (this.player as any).getVideoData?.();
    const duration = this.player.getDuration() || 0;

    const playingId = this.state.playingPlaylistId;
    if (playingId && this.playlistCache[playingId]) {
      const expectedVideoId = this.videoIdCache[playingId]?.[index];
      
      // Strict synchronization check: if iframe hasn't loaded the new queue yet, ignore!
      if (data && data.video_id && expectedVideoId && data.video_id !== expectedVideoId) {
        return;
      }

      const p = [...this.playlistCache[playingId]];
      if (data && data.title && p[index] && p[index].title.startsWith('Track ')) {
        p[index].title = data.title;
        p[index].author = data.author || 'Unknown Artist';
        this.playlistCache[playingId] = p;
        if (this.state.currentPlaylistId === playingId) {
          this.updateState({ playlist: p });
        }
        this.updateState({ playingPlaylist: p });
      }
    }

    this.updateState({
      currentVideoIndex: index,
      duration,
      currentVideoData: data,
    });
  }

  private startProgressTimer = () => {
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = window.setInterval(() => {
      if (this.player && this.state.isPlaying) {
        this.updateState({ currentTime: this.player.getCurrentTime() || 0 });
      }
    }, 1000);
  };

  // ─── Standard controls ────────────────────────────────────────

  public play = () => this.player?.playVideo();
  public pause = () => this.player?.pauseVideo();
  public next = () => this.player?.nextVideo();
  public previous = () => this.player?.previousVideo();

  public seekTo = (seconds: number) => {
    this.player?.seekTo(seconds, true);
    this.updateState({ currentTime: seconds });
  };

  public setVolume = (volume: number) => {
    this.player?.setVolume(volume);
    if (volume > 0 && this.state.isMuted) {
      this.player?.unMute();
      this.updateState({ isMuted: false });
    }
    this.updateState({ volume });
  };

  public toggleMute = () => {
    if (!this.player) return;
    const isMuted = !this.state.isMuted;
    isMuted ? this.player.mute() : this.player.unMute();
    this.updateState({ isMuted });
  };

  public toggleShuffle = () => {
    if (!this.player) return;
    const isShuffle = !this.state.isShuffle;
    this.player.setShuffle(isShuffle);
    this.updateState({ isShuffle });
  };

  public toggleRepeat = () => {
    if (!this.player) return;
    const isRepeat = !this.state.isRepeat;
    this.player.setLoop(isRepeat);
    this.updateState({ isRepeat });
  };
}

export const playerService = new YoutubePlayerService();
