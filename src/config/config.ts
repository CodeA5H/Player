const parsePlaylists = () => {
    const envPlaylists = import.meta.env.VITE_YOUTUBE_PLAYLISTS || import.meta.env.YOUTUBE_PLAYLISTS;
    
    if (envPlaylists) {
        // Parse format: "ID:Name,ID:Name"
        // Example: "PLXvOKkrwVb-I:Main Radio,PLHtDawnEzFmA:Old Beats"
        return envPlaylists.split(',').map((item:any, index:number) => {
            const [id, ...nameParts] = item.split(':');
            const name = nameParts.length > 0 ? nameParts.join(':') : `Playlist ${index + 1}`;
            return { id: id.trim(), name: name.trim() };
        }).filter((p: any) => p.id);
    }
    
    // Fallback if environment variable is not set
    // return [
    //     {
    //         id: "PLHtDawnEzFmA", 
    //         name: "Old Beats"
    //     },
    //     {
    //         id: "PLXvOKkrwVb-I",
    //         name: "Main Radio"
    //     },
    // ];
};

export const config = {
    // Legacy single playlist fallback
    youtubePlaylistId: import.meta.env.VITE_YOUTUBE_PLAYLIST_ID,
    
    // Multiple playlists support
    playlists: parsePlaylists()
};
