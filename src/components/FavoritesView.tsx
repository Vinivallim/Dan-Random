import React, { useEffect, useState, useRef } from 'react';
import { Share2, Heart, Search, Loader2, Copy, ChevronLeft, Download, Upload } from 'lucide-react';
import { CharacterInfo, Favorite } from '../types';

export function FavoritesView({ searchTerm, onSearchChange, user }: { searchTerm: string; onSearchChange: (val: string) => void; user: any }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'directory'>('visual');
  const [selectedCharacter, setSelectedCharacter] = useState<{ copyright: string, character: string, items: Favorite[] } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Load from local storage
    try {
       const stored = localStorage.getItem('favs_' + user.uid);
       let favs: Favorite[] = [];
       if (stored) {
         favs = JSON.parse(stored);
         // Sort descending by createdAt
         favs.sort((a, b) => b.createdAt - a.createdAt);
       }
       setFavorites(favs);
    } catch(err) {
       console.error("Failed to load local favorites");
    } finally {
       setLoading(false);
    }
  }, [user]);

  const handleRemove = (fav: Favorite) => {
    if (!user) return;
    
    // update state
    const newFavs = favorites.filter(f => f.id !== fav.id);
    setFavorites(newFavs);
    
    // update storage
    localStorage.setItem('favs_' + user.uid, JSON.stringify(newFavs));

    // if we're in specific character view and we delete the last one, go back
    if (selectedCharacter) {
       const newItems = selectedCharacter.items.filter(item => item.id !== fav.id);
       if (newItems.length === 0) {
         setSelectedCharacter(null);
       } else {
         setSelectedCharacter({ ...selectedCharacter, items: newItems });
       }
    }
  };

  const handleExport = () => {
    if (!user) return;
    try {
      const stored = localStorage.getItem('favs_' + user.uid);
      if (!stored) return;
      const blob = new Blob([stored], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danbooru_favorites_${user.uid}_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          const stored = localStorage.getItem('favs_' + user.uid);
          let currentFavs: Favorite[] = [];
          if (stored) {
             currentFavs = JSON.parse(stored);
          }
          
          const existingIds = new Set(currentFavs.map(f => f.id));
          const newFavs = data.filter(f => !existingIds.has(f.id));
          
          const combined = [...currentFavs, ...newFavs];
          combined.sort((a, b: any) => b.createdAt - a.createdAt);
          
          localStorage.setItem('favs_' + user.uid, JSON.stringify(combined));
          setFavorites(combined);
          window.dispatchEvent(new Event('favs_updated'));
          alert(`Successfully imported ${newFavs.length} new favorites!`);
        }
      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to parse the backup file. Make sure it's a valid JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = React.useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return favorites.filter(f => 
      f.character.toLowerCase().includes(searchLower) || 
      f.copyright.toLowerCase().includes(searchLower)
    );
  }, [favorites, searchTerm]);

  const groupedByCopyrightAndCharacter = React.useMemo(() => {
    return filtered.reduce((acc, fav) => {
      const cp = fav.copyright || 'unknown';
      if (!acc[cp]) acc[cp] = {};
      if (!acc[cp][fav.character]) acc[cp][fav.character] = [];
      acc[cp][fav.character].push(fav);
      return acc;
    }, {} as Record<string, Record<string, Favorite[]>>);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0a0a0a]">
        <div className="w-16 h-16 border-t-2 border-[#d4af37] rounded-full mx-auto mb-4 opacity-50 animate-spin"></div>
        <p className="text-[11px] opacity-30 uppercase tracking-[0.2em]">Synchronizing Archives...</p>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0a0a0a] p-10 min-h-[400px]">
        <div className="w-16 h-16 border-t-2 border border-white/10 rounded-full flex items-center justify-center mb-6 opacity-30">
          <Heart className="w-6 h-6 text-[#d4af37]" />
        </div>
        <h2 className="text-3xl font-serif text-[#d4af37] italic mb-2 tracking-tight">Empty Archive</h2>
        <p className="opacity-40 text-[10px] uppercase tracking-[0.2em]">No favorites synchronized yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-auto py-4 sm:h-20 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 flex-shrink-0 gap-4">
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-xl font-serif italic text-[#f5d17a]">Saved Tags</span>
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">System Archive</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-[#111] p-1 border border-white/10 rounded-lg">
             <button 
               onClick={() => { setActiveTab('visual'); setSelectedCharacter(null); }}
               className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-all ${activeTab === 'visual' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
             >
               Visual Mode
             </button>
             <button 
               onClick={() => { setActiveTab('directory'); setSelectedCharacter(null); }}
               className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-all ${activeTab === 'directory' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
             >
               Directory Mode
             </button>
          </div>

          <div className="flex items-center gap-2">
            <button
               onClick={handleExport}
               className="p-1.5 border border-white/10 rounded-md text-white/50 hover:text-[#d4af37] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10 transition-colors"
               title="Backup (Export to JSON)"
             >
               <Download className="w-4 h-4" />
             </button>
             <button
               onClick={() => fileInputRef.current?.click()}
               className="p-1.5 border border-white/10 rounded-md text-white/50 hover:text-[#d4af37] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10 transition-colors"
               title="Restore (Import from JSON)"
             >
               <Upload className="w-4 h-4" />
             </button>
             <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-10">
        <div className="mb-8 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]/50" />
            <input 
              type="text" 
              placeholder="Query offline archive..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#111] border border-white/10 hover:border-[#d4af37]/50 focus:border-[#d4af37] rounded-sm text-sm text-[#e5e5e5] placeholder-white/30 focus:outline-none transition-all font-mono"
            />
          </div>
        </div>

        {activeTab === 'visual' ? (
          selectedCharacter ? (
            <div className="flex flex-col">
              <button 
                onClick={() => setSelectedCharacter(null)}
                className="self-start flex items-center gap-2 mb-6 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[#e5e5e5] transition-colors text-sm uppercase tracking-widest font-bold"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Galleries
              </button>
              <h2 className="text-3xl font-serif text-[#d4af37] mb-6 capitalize tracking-tight">{selectedCharacter.character.replace(/_/g, ' ')} <span className="opacity-40 text-lg font-mono ml-2">({selectedCharacter.items.length})</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {selectedCharacter.items.map(fav => (
                  <div key={fav.id} className="group relative bg-[#131313] rounded-lg overflow-hidden border border-white/10 hover:border-[#d4af37]/50 transition-colors flex flex-col h-full">
                    <div className="aspect-[4/5] overflow-hidden bg-black relative">
                      <img 
                        src={fav.imageUrl} 
                        alt={fav.character}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent opacity-80 pointer-events-none"></div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemove(fav); }}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black backdrop-blur-md rounded border border-white/10 hover:border-red-500/50 text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="Remove from system"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col flex-grow relative z-10 -mt-8">
                      <div className="mt-auto border-t border-white/10 pt-3 flex justify-between items-center bg-[#131313]">
                        <a 
                          href={fav.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] uppercase tracking-widest text-[#d4af37] opacity-80 hover:opacity-100 inline-flex items-center gap-2 transition-opacity"
                        >
                           Reference &rarr;
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {Object.entries(groupedByCopyrightAndCharacter).sort((a, b) => a[0].localeCompare(b[0])).map(([copyright, charGroups]) => (
                <div key={copyright} className="flex flex-col">
                  <h3 className="text-xl font-serif text-[#d4af37] mb-6 border-b border-light-white border-white/10 pb-2 capitalize tracking-tight flex items-center gap-2">
                     {copyright.replace(/_/g, ' ')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Object.entries(charGroups).map(([charName, favs]) => (
                      <div 
                        key={charName} 
                        onClick={() => setSelectedCharacter({ copyright, character: charName, items: favs })}
                        className="group relative bg-[#131313] rounded-lg overflow-hidden border border-white/10 hover:border-[#d4af37]/50 transition-colors flex flex-col h-full cursor-pointer"
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-black relative">
                          <img 
                            src={favs[0].imageUrl} 
                            alt={charName}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-90"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/50 to-transparent opacity-90 group-hover:opacity-70 transition-opacity pointer-events-none"></div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                            <h4 className="font-serif italic text-white text-2xl text-center mb-2 drop-shadow-lg capitalize relative z-10 break-words w-full" style={{textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>
                              {charName.replace(/_/g, ' ')}
                            </h4>
                            <span className="bg-black/80 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-xs font-mono text-[#d4af37] z-10 shadow-xl">
                              {favs.length} Image{favs.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-8">
            {Object.entries(groupedByCopyrightAndCharacter).sort((a, b) => a[0].localeCompare(b[0])).map(([copyright, charGroups]) => {
               return (
               <div key={copyright} className="flex flex-col">
                 <h3 className="text-xl font-serif text-[#d4af37] mb-4 border-b border-light-white border-white/10 pb-2 capitalize tracking-tight flex items-center gap-2">
                    {copyright.replace(/_/g, ' ')}
                    <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/50 inline-block align-middle font-sans not-italic font-normal">{Object.values(charGroups).flat().length}</span>
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                    {Object.entries(charGroups).map(([charName, favs]) => (
                       <div key={charName} className="group relative flex items-center justify-between bg-[#131313] border border-white/10 rounded-md hover:border-[#d4af37]/50 transition-colors pr-1.5 overflow-hidden">
                         <a 
                           href={`https://danbooru.donmai.us/posts?tags=${charName}`}
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex-1 px-3 py-1.5 text-xs text-[#e5e5e5] hover:text-[#d4af37] transition-colors capitalize truncate decoration-white/20 decoration-dashed underline-offset-4 group-hover:underline"
                           title={charName}
                         >
                           {charName.replace(/_/g, ' ')} {favs.length > 1 && <span className="ml-1 text-[#d4af37]/60 font-mono text-[10px]">x{favs.length}</span>}
                         </a>
                         <div className="flex shrink-0">
                           <button 
                             onClick={() => navigator.clipboard.writeText(`https://danbooru.donmai.us/posts?tags=${charName}`)}
                             className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                             title="Copy URL"
                           >
                             <Share2 className="w-3 h-3" />
                           </button>
                           <button 
                             onClick={() => navigator.clipboard.writeText(charName)}
                             className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                             title="Copy Tag"
                           >
                             <Copy className="w-3 h-3" />
                           </button>
                           <button 
                             onClick={() => {
                               // Delete all favs for this character
                               favs.forEach(f => handleRemove(f));
                             }}
                             className="p-1 hover:bg-red-500/10 rounded text-white/50 hover:text-red-400 transition-colors"
                             title={`Remove all ${favs.length} favorites`}
                           >
                             <Heart className="w-3 h-3 fill-current" />
                           </button>
                         </div>
                       </div>
                    ))}
                 </div>
               </div>
               );
            })}
          </div>
        )}
        
        {filtered.length === 0 && favorites.length > 0 && (
           <div className="text-center py-12 text-[11px] uppercase tracking-widest opacity-40">No entries match your query.</div>
        )}
      </div>
    </div>
  );
}

