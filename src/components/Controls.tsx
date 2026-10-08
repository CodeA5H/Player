import React, { useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Shuffle, Repeat 
} from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { formatTime } from '../utils/format';

const Controls: React.FC = () => {
  const { 
    isPlaying, play, pause, next, previous, 
    currentTime, duration, seekTo,
    volume, setVolume, isMuted, toggleMute,
    isShuffle, toggleShuffle,
    isRepeat, toggleRepeat
  } = usePlayer();

  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seekTo(pos * duration);
  };

  return (
    <div className="flex flex-col w-full">
      
      {/* Progress Bar */}
      <div className="flex items-center gap-4 text-[10px] text-secondary/60 font-mono font-medium mb-12 w-full">
        <span className="w-8 text-right">{formatTime(currentTime)}</span>
        
        {/* Fixed height container prevents layout shift */}
        <div 
          ref={progressRef}
          className="flex-1 h-6 cursor-pointer group relative flex items-center"
          onClick={handleProgressClick}
        >
          {/* Background track (thin normally, expands on hover) */}
          <div className="w-full h-px group-hover:h-1 bg-secondary/20 rounded-full transition-all duration-200 relative">
            <div 
              className="absolute top-0 left-0 h-full bg-highlight rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          {/* Thumb (hidden normally, shows on hover) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-highlight rounded-full opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)` }}
          />
        </div>

        <span className="w-8">{formatTime(duration)}</span>
      </div>

      {/* Main Playback Controls */}
      <div className="flex items-center justify-center gap-8 mb-10 w-full">
        <button 
          onClick={toggleShuffle} 
          className={`transition-colors ${isShuffle ? 'text-highlight' : 'text-primary/60 hover:text-primary'}`}
          aria-label="Toggle shuffle"
        >
          <Shuffle size={16} strokeWidth={2} />
        </button>

        <button 
          onClick={previous}
          className="text-primary hover:text-highlight transition-colors"
          aria-label="Previous song"
        >
          <SkipBack size={22} fill="currentColor" />
        </button>
        
        <button 
          onClick={isPlaying ? pause : play}
          className="text-highlight hover:scale-105 transition-transform"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={36} fill="currentColor" />
          ) : (
            <Play size={36} fill="currentColor" className="ml-1" />
          )}
        </button>
        
        <button 
          onClick={next}
          className="text-primary hover:text-highlight transition-colors"
          aria-label="Next song"
        >
          <SkipForward size={22} fill="currentColor" />
        </button>

        <button 
          onClick={toggleRepeat} 
          className={`transition-colors ${isRepeat ? 'text-highlight' : 'text-primary/60 hover:text-primary'}`}
          aria-label="Toggle repeat"
        >
          <Repeat size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center justify-center w-full h-6 text-primary/60">
        <div className="flex items-center gap-3 w-40">
          <button 
            onClick={toggleMute}
            className="hover:text-primary transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-px hover:h-1 bg-secondary/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 hover:[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-2 hover:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-highlight [&::-webkit-slider-thumb]:rounded-full cursor-pointer accent-highlight transition-all duration-200"
          />
        </div>
      </div>
      
    </div>
  );
};

export default Controls;
