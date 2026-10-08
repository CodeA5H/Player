export type PlaylistItem = {
  videoId: string;
  title: string;
  author: string;
  duration?: string;
};

// Optional: If you want to provide a real Data API key, set it here or in .env
// This enables fetching exact titles and artists for the entire playlist up front.
const API_KEY = import.meta.env.YOUTUBE_API_KEY || "";

export async function fetchPlaylistMetadata(playlistId: string): Promise<PlaylistItem[]> {
  if (!API_KEY) {
    return [];
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.items) {
      return data.items.map((item: any) => {
        // Splitting "Artist - Title" format commonly used in music videos, fallback to whole title
        let title = item.snippet.title;
        let author = item.snippet.videoOwnerChannelTitle || "Unknown Artist";
        
        if (title.includes(" - ")) {
          const parts = title.split(" - ");
          author = parts[0];
          title = parts.slice(1).join(" - ");
        }

        return {
          videoId: item.snippet.resourceId.videoId,
          title,
          author,
          duration: "" // Duration requires an additional API call to videos endpoint, skipping for simplicity unless needed
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch playlist metadata", error);
    return [];
  }
}

export async function fetchTitlesWithNoembed(videoIds: string[]): Promise<PlaylistItem[]> {
  const items: PlaylistItem[] = [];
  
  // Fetch in batches of 5 to avoid overwhelming the API
  for (let i = 0; i < videoIds.length; i += 5) {
    const batch = videoIds.slice(i, i + 5);
    const promises = batch.map(async (id, batchIndex) => {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
        const data = await res.json();
        if (data.title) {
          let title = data.title;
          let author = data.author_name || "Unknown Artist";
          
          if (title.includes(" - ")) {
            const parts = title.split(" - ");
            author = parts[0];
            title = parts.slice(1).join(" - ");
          }
          return { videoId: id, title, author };
        }
      } catch (e) {
        // Silently fail for individual videos if noembed fails
      }
      return { videoId: id, title: `Track ${i + batchIndex + 1}`, author: "Unknown Artist" };
    });
    
    const results = await Promise.all(promises);
    items.push(...results);
  }
  return items;
}

