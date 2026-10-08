import React from 'react';
import { usePlayer } from '../hooks/usePlayer';

const NowPlaying: React.FC = () => {
  const { playingPlaylist, currentVideoIndex, currentVideoData, isReady } = usePlayer();

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-secondary/20 rounded"></div>
        <div className="h-4 w-32 bg-secondary/20 rounded"></div>
      </div>
    );
  }

  // Get the track from the PLAYING playlist
  const currentItem = playingPlaylist[currentVideoIndex];
  
  // Use data from currently playing video if available, otherwise fallback to playlist data
  let title = currentItem?.title || 'Unknown Track';
  let author = currentItem?.author || 'Unknown Artist';

  if (currentVideoData) {
    if (currentVideoData.title) {
      title = currentVideoData.title;
      // Rough attempt to split "Author - Title" if present
      if (title.includes(" - ")) {
        const parts = title.split(" - ");
        author = parts[0];
        title = parts.slice(1).join(" - ");
      } else {
        author = currentVideoData.author || author;
      }
    }
  }

  return (
    <div className="flex flex-col w-full pr-8">
      <div className="text-[10px] tracking-[0.3em] font-medium text-secondary/60 uppercase mb-8">
        Now Playing
      </div>
      <h2 className="text-3xl lg:text-4xl font-bold text-highlight tracking-tight leading-tight mb-4 line-clamp-3">
        {title}
      </h2>
      <h3 className="text-lg text-secondary/80 tracking-wide font-light">
        {author}
      </h3>
    </div>
  );
};

export default NowPlaying;
