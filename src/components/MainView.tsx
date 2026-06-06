import React, { useState, useEffect } from 'react';
import { Camera, Dices, Heart, Navigation, Copy, Loader2, Share2, BarChart2, Info, X } from 'lucide-react';
import { CharacterInfo } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function TagStats({ user }: { user: any }) {
  const [stats, setStats] = useState<any[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    if (!user) {
      setStats([]);
      setTotalSaved(0);
      return;
    }

    const loadStats = () => {
      try {
        const stored = localStorage.getItem('favs_' + user.uid);
        const data = stored ? JSON.parse(stored) : [];
        
        setTotalSaved(data.length);

        const categoryCounts: Record<string, number> = {};
        data.forEach((item: any) => {
           let cat = item.copyright || 'unknown';
           if (cat !== 'unknown') {
              cat = cat.replace(/_/g, ' ');
           }
           categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const sortedStats = Object.entries(categoryCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // display top 5 categories

        setStats(sortedStats);
      } catch (err) {
        console.error("Error formatting stats", err);
      }
    };

    loadStats();
    window.addEventListener('favs_updated', loadStats);
    return () => window.removeEventListener('favs_updated', loadStats);
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 border-t border-white/5 bg-[#0a0a0a] flex flex-col items-center justify-center">
        <p className="opacity-40 text-xs uppercase tracking-widest text-center mt-4">Sign in to view personalized statistics</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 border-t border-white/5 mt-auto">
      <div className="flex items-center gap-2 mb-8">
        <BarChart2 className="w-5 h-5 text-[#d4af37]" />
        <h3 className="text-xl font-serif text-[#e5e5e5] tracking-tight">Discovery Intelligence</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 flex flex-col justify-center">
           <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37] font-semibold mb-2">Total Archives Saved</p>
           <p className="text-5xl font-serif font-medium tracking-tight mb-6">{totalSaved}</p>
           
           <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37] font-semibold mb-2">Dominant Source</p>
           <p className="text-lg font-medium tracking-wide text-white capitalize">{stats.length > 0 ? stats[0].name : 'N/A'}</p>
        </div>
        
        <div className="col-span-1 md:col-span-2 h-[200px] w-full mt-4 md:mt-0">
          {stats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#666', fontSize: 10 }}
                  tickFormatter={val => val.length > 12 ? val.substring(0, 12) + '...' : val}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#666', fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff0a' }}
                  contentStyle={{ backgroundColor: '#131313', border: '1px solid #d4af3733', borderRadius: '4px', fontSize: '12px' }}
                  itemStyle={{ color: '#d4af37', textTransform: 'capitalize' }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#d4af37' : '#ffffff20'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center border border-white/5 rounded-lg bg-white/5">
                <p className="text-xs opacity-40 uppercase tracking-widest text-[#d4af37]">Not enough data</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MainView({ onRequireLogin, user }: { onRequireLogin: () => void; user: any }) {
  const [currentCharacter, setCurrentCharacter] = useState<CharacterInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFav, setSavingFav] = useState(false);
  const [searchMode, setSearchMode] = useState<string>('post');
  const [ratingFilter, setRatingFilter] = useState<string>('sfw');
  const [genderFilter, setGenderFilter] = useState<string>('any');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [extraTagFilter, setExtraTagFilter] = useState<string>('');

  const [minTagCount, setMinTagCount] = useState<string>('0');
  const [maxTagCount, setMaxTagCount] = useState<string>('500000');
  const [minYear, setMinYear] = useState<string>('2000');
  const [maxYear, setMaxYear] = useState<string>('2024');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [useCountFilter, setUseCountFilter] = useState<boolean>(false);
  const [useYearFilter, setUseYearFilter] = useState<boolean>(false);

  const [tagModalData, setTagModalData] = useState<any | null>(null);
  const [tagModalLoading, setTagModalLoading] = useState(false);
  const [tagModalError, setTagModalError] = useState<string | null>(null);

  const [sourceSuggestions, setSourceSuggestions] = useState<any[]>([]);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [sourceSuggestionTimeout, setSourceSuggestionTimeout] = useState<any>(null);

  const [extraSuggestions, setExtraSuggestions] = useState<any[]>([]);
  const [showExtraSuggestions, setShowExtraSuggestions] = useState(false);
  const [extraSuggestionTimeout, setExtraSuggestionTimeout] = useState<any>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowSourceSuggestions(false);
      setShowExtraSuggestions(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const openTagModal = async (tag: string) => {
    setTagModalData(null);
    setTagModalError(null);
    setTagModalLoading(true);
    try {
      const response = await fetch(`/api/tag-info?tag=${encodeURIComponent(tag)}`);
      if (!response.ok) throw new Error('Failed to fetch tag info');
      const data = await response.json();
      setTagModalData(data);
    } catch(err) {
      setTagModalError('Could not load tag information.');
    } finally {
      setTagModalLoading(false);
    }
  };

  const fetchRandomCharacter = async () => {
    setLoading(true);
    setError(null);
    setIsFavorite(false);
    
    try {
      const params = new URLSearchParams();
      params.append('mode', searchMode);
      params.append('rating', ratingFilter);
      if (genderFilter !== 'any') params.append('gender', genderFilter);
      if (sourceFilter.trim()) params.append('source', sourceFilter);
      if (extraTagFilter.trim()) params.append('extraTag', extraTagFilter);
      if (useCountFilter) {
        if (minTagCount !== '0') params.append('minTagCount', minTagCount);
        if (maxTagCount !== '500000') params.append('maxTagCount', maxTagCount);
      }
      if (useYearFilter) {
        if (minYear !== '2000') params.append('minYear', minYear);
        if (maxYear !== '2024') params.append('maxYear', maxYear);
      }

      const response = await fetch(`/api/random-character?${params.toString()}`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to fetch character data');
      }
      const data: CharacterInfo = await response.json();
      setCurrentCharacter(data);
      
      // Check if already favorited
      if (user) {
        try {
           const stored = localStorage.getItem('favs_' + user.uid);
           const favs = stored ? JSON.parse(stored) : [];
           if (favs.some((f: any) => f.sourceUrl === data.sourceUrl)) {
             setIsFavorite(true);
           }
        } catch(e) {}
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      onRequireLogin();
      return;
    }
    if (!currentCharacter || isFavorite || savingFav) return;
    
    setSavingFav(true);
    try {
      const stored = localStorage.getItem('favs_' + user.uid);
      const favs = stored ? JSON.parse(stored) : [];
      
      const newFav = {
        id: 'fav_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        character: currentCharacter.character,
        copyright: currentCharacter.copyright,
        imageUrl: currentCharacter.imageUrl,
        sourceUrl: currentCharacter.sourceUrl,
        userId: user.uid,
        createdAt: Date.now()
      };
      
      favs.push(newFav);
      localStorage.setItem('favs_' + user.uid, JSON.stringify(favs));
      setIsFavorite(true);
      window.dispatchEvent(new Event('favs_updated'));
    } catch (err) {
      console.error("Failed to save favorite locally", err);
    } finally {
      setSavingFav(false);
    }
  };

  const displayName = currentCharacter?.character.replace(/_/g, ' ') || '';
  const displayCopyright = currentCharacter?.copyright.replace(/_/g, ' ') || '';

  return (
    <div className="flex-1 flex flex-col relative h-full w-full bg-[#0a0a0a]">
      {/* Top Action Bar */}
      <header className="h-auto sm:h-24 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 sm:px-10 flex-shrink-0 gap-4 py-4 sm:py-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs w-full sm:w-auto flex-wrap">
          <select 
            value={searchMode} 
            onChange={(e) => setSearchMode(e.target.value)}
            className="px-3 py-2 bg-[#131313] border border-white/10 hover:border-[#d4af37]/50 rounded-sm text-[#e5e5e5] focus:border-[#d4af37] outline-none transition-colors appearance-none cursor-pointer w-full sm:w-auto font-medium text-[#d4af37]"
          >
            <option value="post">Mode: Random Image</option>
            <option value="tag">Mode: Random DB Tag</option>
          </select>
          <select 
            value={ratingFilter} 
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-[#131313] border border-white/10 hover:border-[#d4af37]/50 rounded-sm text-[#e5e5e5] focus:border-[#d4af37] outline-none transition-colors appearance-none cursor-pointer w-full sm:w-auto"
          >
            <option value="sfw">SFW Only (Safe)</option>
            <option value="any">Any Rating (Inc. NSFW)</option>
            <option value="nsfw">NSFW Only (Explicit)</option>
          </select>
          <select 
            value={genderFilter} 
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 bg-[#131313] border border-white/10 hover:border-[#d4af37]/50 rounded-sm text-[#e5e5e5] focus:border-[#d4af37] outline-none transition-colors appearance-none cursor-pointer w-full sm:w-auto"
          >
            <option value="any">Any Identity</option>
            <option value="1girl">Female (1girl)</option>
            <option value="1boy">Male (1boy)</option>
            <option value="futanari">Futanari</option>
            <option value="trap">Trap / Crossdresser</option>
            <option value="androgynous">Androgynous</option>
            <option value="other">Other (1other)</option>
          </select>
          <div className="relative w-full sm:w-48">
            <input 
              type="text" 
              placeholder="Search universe..."
              title="Category 3: Copyrights/Source"
              value={sourceFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSourceFilter(val);
                if (sourceSuggestionTimeout) clearTimeout(sourceSuggestionTimeout);
                if (val.trim().length >= 2) {
                  setSourceSuggestionTimeout(setTimeout(async () => {
                    try {
                      // category 3 is copyright
                      const res = await fetch(`/api/tag-suggestions?q=${encodeURIComponent(val)}&category=3`);
                      if (res.ok) {
                        const data = await res.json();
                        setSourceSuggestions(data);
                        setShowSourceSuggestions(true);
                      }
                    } catch (err) {}
                  }, 300));
                } else {
                  setSourceSuggestions([]);
                  setShowSourceSuggestions(false);
                }
              }}
              onFocus={() => { if (sourceSuggestions.length > 0) setShowSourceSuggestions(true); }}
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-2 bg-[#131313] border border-white/10 hover:border-[#d4af37]/50 rounded-sm text-[#e5e5e5] placeholder-white/30 focus:border-[#d4af37] outline-none transition-colors w-full font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && (setShowSourceSuggestions(false), fetchRandomCharacter())}
            />
            {showSourceSuggestions && sourceSuggestions.length > 0 && (
              <div 
                className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-[#131313] border border-white/10 rounded-md shadow-2xl z-50 py-1 flex flex-col custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {sourceSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className="flex flex-col text-left px-3 py-2 hover:bg-[#d4af37]/10 transition-colors border-b border-white/5 last:border-0"
                    onClick={() => {
                      setSourceFilter(s.name);
                      setShowSourceSuggestions(false);
                      setSourceSuggestions([]);
                    }}
                  >
                    <span className="text-[#e5e5e5] text-xs font-medium capitalize break-words">{s.name.replace(/_/g, ' ')}</span>
                    <span className="text-[#d4af37] text-[10px] font-mono opacity-80">{s.postCount.toLocaleString()} posts</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-48">
            <input 
              type="text" 
              placeholder="Any Danbooru tag..."
              title="Additional tag to filter by"
              value={extraTagFilter}
              onChange={(e) => {
                const val = e.target.value;
                setExtraTagFilter(val);
                if (extraSuggestionTimeout) clearTimeout(extraSuggestionTimeout);
                if (val.trim().length >= 2) {
                  setExtraSuggestionTimeout(setTimeout(async () => {
                    try {
                      // Search all categories
                      const res = await fetch(`/api/tag-suggestions?q=${encodeURIComponent(val)}`);
                      if (res.ok) {
                        const data = await res.json();
                        setExtraSuggestions(data);
                        setShowExtraSuggestions(true);
                      }
                    } catch (err) {}
                  }, 300));
                } else {
                  setExtraSuggestions([]);
                  setShowExtraSuggestions(false);
                }
              }}
              onFocus={() => { if (extraSuggestions.length > 0) setShowExtraSuggestions(true); }}
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-2 bg-[#131313] border border-white/10 hover:border-[#d4af37]/50 rounded-sm text-[#e5e5e5] placeholder-white/30 focus:border-[#d4af37] outline-none transition-colors w-full font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && (setShowExtraSuggestions(false), fetchRandomCharacter())}
            />
            {showExtraSuggestions && extraSuggestions.length > 0 && (
              <div 
                className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-[#131313] border border-white/10 rounded-md shadow-2xl z-50 py-1 flex flex-col custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {extraSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className="flex flex-col text-left px-3 py-2 hover:bg-[#d4af37]/10 transition-colors border-b border-white/5 last:border-0"
                    onClick={() => {
                      setExtraTagFilter(s.name);
                      setShowExtraSuggestions(false);
                      setExtraSuggestions([]);
                    }}
                  >
                    <span className="text-[#e5e5e5] text-xs font-medium break-words">{s.name}</span>
                    <span className="text-[#d4af37] text-[10px] font-mono opacity-80">{s.postCount.toLocaleString()} posts (Cat: {s.category})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)} 
            className={`px-3 py-2 border rounded-sm outline-none transition-colors text-[10px] font-bold tracking-widest uppercase ${showAdvanced ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]' : 'bg-[#131313] border-white/10 text-white/50 hover:border-[#d4af37]/50 hover:text-white/80'}`}
          >
            Filters
          </button>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-end mt-4 sm:mt-0">
          <button 
            onClick={fetchRandomCharacter}
            disabled={loading}
            className={`relative flex items-center justify-center min-w-[150px] w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-[#d4af37] text-black font-bold rounded-sm text-[10px] sm:text-xs uppercase tracking-widest hover:bg-[#c19a2e] disabled:opacity-90 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#d4af37]/20 overflow-hidden`}
          >
            {loading && (
              <span className="absolute inset-0 flex items-center justify-center bg-[#c19a2e]">
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span className="ml-2">Scanning...</span>
              </span>
            )}
            <span className={`flex items-center transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}>
              <Dices className="w-4 h-4 mr-2" />
              Generate Tag
            </span>
          </button>
          <div className="hidden sm:block w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f5d17a] border border-white/20 shadow-md"></div>
        </div>
      </header>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="w-full bg-[#131313] p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-center text-xs text-[#e5e5e5] shrink-0">
          
          <div className="flex flex-col flex-1 w-full relative">
            <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
              <input type="checkbox" checked={useCountFilter} onChange={(e) => setUseCountFilter(e.target.checked)} className="accent-[#d4af37]" />
              <span className="opacity-70 uppercase tracking-widest text-[9px] font-bold">Filter By Tag Count</span>
            </label>
            <div className={`flex flex-col sm:flex-row w-full gap-4 transition-opacity ${useCountFilter ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex-1 w-full relative">
                <div className="flex justify-between mb-2">
                  <span className="opacity-70 uppercase tracking-widest text-[9px] font-bold">Min Count (Tags)</span>
                  <span className="font-mono text-[#d4af37]">{minTagCount}</span>
                </div>
                <input type="range" min="0" max="100000" step="1000" value={minTagCount} onChange={(e) => setMinTagCount(e.target.value)} className="w-full accent-[#d4af37] cursor-pointer" />
              </div>
              <div className="flex-1 w-full relative">
                <div className="flex justify-between mb-2">
                  <span className="opacity-70 uppercase tracking-widest text-[9px] font-bold">Max Count (Tags)</span>
                  <span className="font-mono text-[#d4af37]">{maxTagCount === '500000' ? 'Any' : maxTagCount}</span>
                </div>
                <input type="range" min="100" max="500000" step="1000" value={maxTagCount} onChange={(e) => setMaxTagCount(e.target.value)} className="w-full accent-[#d4af37] cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-16 bg-white/10 mx-2"></div>

          <div className="flex flex-col flex-1 w-full relative">
            <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
              <input type="checkbox" checked={useYearFilter} onChange={(e) => setUseYearFilter(e.target.checked)} className="accent-[#d4af37]" />
              <span className="opacity-70 uppercase tracking-widest text-[9px] font-bold">Filter By Year Uploaded</span>
            </label>
            <div className={`flex flex-col sm:flex-row w-full gap-4 transition-opacity ${useYearFilter ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex-1 w-full relative">
                <div className="flex justify-between mb-2">
                  <span className="opacity-70 uppercase tracking-widest text-[9px] font-bold">From Year</span>
                  <span className="font-mono text-[#d4af37]">{minYear}</span>
                </div>
                <input type="range" min="1990" max="2026" step="1" value={minYear} onChange={(e) => setMinYear(e.target.value)} className="w-full accent-[#d4af37] cursor-pointer" />
              </div>
              <div className="flex-1 w-full relative">
                <div className="flex justify-between mb-2">
                  <span className="opacity-70 uppercase tracking-widest text-[9px] font-bold">To Year</span>
                  <span className="font-mono text-[#d4af37]">{maxYear}</span>
                </div>
                <input type="range" min="1990" max="2026" step="1" value={maxYear} onChange={(e) => setMaxYear(e.target.value)} className="w-full accent-[#d4af37] cursor-pointer" />
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!currentCharacter && !loading && !error && (
          <div className="flex flex-col items-center justify-center p-10 h-full min-h-[400px]">
            <div className="w-16 h-16 border-t-2 border border-white/10 rounded-full flex items-center justify-center mb-6 opacity-30">
              <Dices className="w-6 h-6 text-[#d4af37]" />
            </div>
            <h2 className="text-3xl font-serif italic text-[#d4af37] mb-2 text-center tracking-tight">Initiate Discovery Sequence</h2>
            <p className="opacity-40 text-[10px] uppercase tracking-[0.2em] max-w-sm text-center">
              Tap generate to cross reference Character and Copyright tags from Danbooru.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-10 h-full min-h-[400px]">
            <div className="w-16 h-16 border-t-2 border-[#d4af37] rounded-full mx-auto mb-4 opacity-50 animate-spin"></div>
            <p className="text-[11px] opacity-30 uppercase tracking-[0.2em]">Dialing network anomalies...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center p-10 h-full min-h-[400px]">
            <p className="text-red-400 font-medium mb-6 uppercase tracking-widest text-sm">{error}</p>
            <button 
              onClick={fetchRandomCharacter}
              className="px-6 py-2 border border-white/20 text-[#d4af37] hover:bg-white/5 rounded-sm uppercase tracking-widest text-xs transition-colors"
            >
              Reboot Search
            </button>
          </div>
        )}

        {currentCharacter && !loading && (
          <div className="flex flex-col p-6 sm:p-10 gap-10 lg:flex-row min-h-[500px]">
            {/* Tag Data Card */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center">
              <div className="mb-2">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37] font-bold">Generated Tag</span>
              </div>
              
              <div className="flex items-start gap-4 mb-4">
                <button 
                  onClick={() => openTagModal(currentCharacter.character)}
                  className="text-left group outline-none break-words"
                >
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif leading-tight capitalize text-[#e5e5e5] group-hover:text-[#d4af37] transition-colors decoration-white/20 decoration-dashed underline-offset-8 group-hover:underline">
                    {displayName}
                    <Info className="inline-block w-6 h-6 ml-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#d4af37] -translate-y-2" />
                  </h2>
                </button>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => navigator.clipboard.writeText(`https://danbooru.donmai.us/posts?tags=${currentCharacter.character}`)}
                    className="p-3 bg-white/5 border border-white/10 hover:border-[#d4af37]/50 rounded-full text-white/50 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-all flex-shrink-0"
                    title="Copy URL to clipboard"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText(currentCharacter.character)}
                    className="p-3 bg-white/5 border border-white/10 hover:border-[#d4af37]/50 rounded-full text-white/50 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-all flex-shrink-0"
                    title="Copy Tag to clipboard"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-8">
                <span className="text-xl italic opacity-60 font-serif">Original Source:</span>
                <button 
                  onClick={() => openTagModal(currentCharacter.copyright)}
                  className="text-xl font-medium tracking-tight border-b border-[#d4af37]/40 text-[#f5d17a] capitalize hover:text-white transition-colors"
                >
                  {displayCopyright}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
                  <p className="text-[10px] opacity-40 uppercase mb-1 tracking-widest">Type</p>
                  <p className="text-sm font-medium tracking-wide">Multi-Tag</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
                  <p className="text-[10px] opacity-40 uppercase mb-1 tracking-widest">Source Material</p>
                  <a href={currentCharacter.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm truncate block hover:text-[#d4af37] transition-colors underline decoration-white/20 underline-offset-4">Open Danbooru Post &rarr;</a>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={toggleFavorite}
                  disabled={savingFav || isFavorite}
                  className={`flex-1 h-12 border rounded-lg flex items-center justify-center gap-2 transition-colors text-xs uppercase tracking-widest font-semibold ${
                    isFavorite 
                      ? 'border-[#d4af37]/50 text-[#d4af37] bg-[#d4af37]/10' 
                      : 'border-white/20 hover:bg-white/5 opacity-80 hover:opacity-100'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#d4af37]' : ''}`} />
                  <span>{savingFav ? 'Saving Data...' : (isFavorite ? 'Saved to System' : 'Save to Favorites')}</span>
                </button>
              </div>
            </div>

            {/* Image Preview Area */}
            <div className="w-full lg:w-1/2 h-[450px] lg:h-[600px] relative bg-[#131313] rounded-xl sm:rounded-2xl border-y sm:border border-white/10 overflow-hidden shadow-2xl -mx-6 sm:mx-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10 pointer-events-none"></div>
              
              <div className="w-full h-full flex items-center justify-center bg-black/50 p-2 sm:p-4">
                <img src={currentCharacter.imageUrl} alt={displayName} className="w-full h-full object-contain" />
              </div>
              
              {/* Metadata Overlay */}
              <div className="absolute bottom-6 left-6 z-20">
                <p className="text-[10px] opacity-60 mb-1 tracking-widest uppercase">Visual Asset</p>
                <p className="text-xs font-mono opacity-80">{currentCharacter.sourceUrl.replace('https://', '')}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Render our TagStats component */}
        <div className={(loading || error) ? "hidden" : "block"}>
           <TagStats user={user} />
        </div>
      </div>

      {/* Tag Info Modal */}
      {(tagModalLoading || tagModalData || tagModalError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#131313] border border-[#d4af37]/30 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <h3 className="uppercase tracking-[0.2em] text-[#d4af37] text-xs font-bold">Network Reference File</h3>
              <button onClick={() => { setTagModalData(null); setTagModalLoading(false); setTagModalError(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {tagModalLoading && (
                 <div className="flex flex-col items-center justify-center h-48">
                    <div className="w-10 h-10 border-t-2 border-[#d4af37] rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Querying database...</p>
                 </div>
              )}
              
              {tagModalError && (
                 <div className="flex flex-col items-center justify-center h-48">
                    <p className="text-red-400 text-sm uppercase tracking-widest">{tagModalError}</p>
                 </div>
              )}
              
              {tagModalData && !tagModalLoading && (
                 <div className="flex flex-col gap-8">
                    <div>
                       <h2 className="text-3xl sm:text-5xl font-serif text-[#e5e5e5] mb-2 leading-tight capitalize break-words">{tagModalData.tag.replace(/_/g, ' ')}</h2>
                       <div className="flex gap-4 items-center">
                          <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-white/5 border border-white/10 rounded text-white/70">
                            Count: {tagModalData.postCount.toLocaleString()}
                          </span>
                       </div>
                    </div>
                    
                    {tagModalData.aliases && tagModalData.aliases.length > 0 && (
                       <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-semibold mb-3">Known Aliases</p>
                          <div className="flex flex-wrap gap-2">
                             {tagModalData.aliases.map((alias: string, i: number) => (
                                <span key={i} className="text-xs px-2 py-1 bg-[#1a1a1a] border border-[#d4af37]/20 rounded-md text-white/80">{alias.replace(/_/g, ' ')}</span>
                             ))}
                          </div>
                       </div>
                    )}
                    
                    {tagModalData.relatedTags && tagModalData.relatedTags.length > 0 && (
                       <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-semibold mb-3">Associated Entities</p>
                          <div className="flex flex-wrap gap-2">
                             {tagModalData.relatedTags.map((rtag: string, i: number) => (
                                <button key={i} onClick={() => openTagModal(rtag)} className="text-xs px-2 py-1 bg-[#1a1a1a] border border-white/10 hover:border-[#d4af37]/50 rounded-md text-white/80 transition-colors">
                                  {rtag.replace(/_/g, ' ')}
                                </button>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
