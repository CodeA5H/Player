import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SavedPlaylist } from '../hooks/useSavedPlaylists';
import { config } from '../config/config';

type SidebarProps = {
  playlists: SavedPlaylist[];
  currentPlaylistId: string;
  onSelectPlaylist: (id: string) => void;
  onAddPlaylist: (id: string, name: string) => void;
  onRemovePlaylist: (id: string) => void;
};

const Sidebar: React.FC<SidebarProps> = ({ 
  playlists, currentPlaylistId, onSelectPlaylist, onAddPlaylist, onRemovePlaylist 
}) => {
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newId.trim()) {
      onAddPlaylist(newId, newName);
      setNewId('');
      setNewName('');
    }
  };

  const defaultIds = config.playlists?.map((p: any) => p.id) || [];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="text-[10px] tracking-[0.3em] font-medium text-secondary/60 uppercase mb-8">
        Stations
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-4">
        {playlists.map((pl) => {
          const isDefault = defaultIds.includes(pl.id);
          const isActive = currentPlaylistId === pl.id;
          
          return (
            <div 
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className="group flex items-center justify-between cursor-pointer"
            >
              <span className={`text-sm md:text-base tracking-wide transition-colors ${
                isActive
                  ? 'text-highlight font-semibold' 
                  : 'text-primary/70 group-hover:text-primary'
              }`}>
                {pl.name}
              </span>
              {!isDefault && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePlaylist(pl.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-secondary hover:text-red-400 transition-opacity"
                  title="Remove Playlist"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-8 border-t border-secondary/10">
        <div className="text-[10px] tracking-[0.2em] font-medium text-secondary/60 uppercase mb-4">
          Add Station
        </div>
        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Station Name" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-black/40 text-xs text-primary px-3 py-2.5 rounded-lg border border-secondary/10 focus:outline-none focus:border-highlight/50 placeholder-secondary/50 transition-colors"
          />
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="YouTube Playlist ID or URL..." 
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full bg-black/40 text-xs text-primary px-3 py-2.5 rounded-lg border border-secondary/10 focus:outline-none focus:border-highlight/50 placeholder-secondary/50 pr-8 transition-colors"
              required
            />
            <button 
              type="submit"
              className="absolute right-1 p-1.5 bg-highlight/90 hover:bg-highlight text-background rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!newId.trim()}
            >
              <Plus size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sidebar;
