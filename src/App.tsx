import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Heart, Search } from 'lucide-react';
import { MainView } from './components/MainView';
import { FavoritesView } from './components/FavoritesView';

export default function App() {
  const [user, setUser] = useState<{ uid: string, displayName: string, photoURL?: string } | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [view, setView] = useState<'main' | 'favorites'>('main');
  const [searchTerm, setSearchTerm] = useState('');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginName, setLoginName] = useState('');

  useEffect(() => {
    // Check local storage for user session
    const storedUser = localStorage.getItem('local_dan_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setAuthInitialized(true);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginName && loginName.trim()) {
      const newUser = {
        uid: 'local_' + Date.now(),
        displayName: loginName.trim()
      };
      localStorage.setItem('local_dan_user', JSON.stringify(newUser));
      setUser(newUser);
      setShowLoginModal(false);
      setLoginName('');
    }
  };

  const logout = () => {

    localStorage.removeItem('local_dan_user');
    setUser(null);
    setView('main');
  };

  if (!authInitialized) {
    return <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col"></div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-[#e5e5e5] font-sans overflow-hidden">
      {/* Left Sidebar: Navigation & Identity */}
      <aside className="w-64 border-r border-white/10 flex flex-col p-6 flex-shrink-0">
        <div className="mb-12">
          <h1 
            onClick={() => setView('main')}
            className="text-2xl font-serif italic text-[#d4af37] tracking-tighter cursor-pointer hover:opacity-80 transition-opacity"
          >
            Dan-Random
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mt-1">Discovery Engine</p>
        </div>

        <nav className="space-y-6 flex-1">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase opacity-30 tracking-widest">Main</p>
            <button 
              onClick={() => setView('main')} 
              className={`flex w-full items-center gap-3 text-sm transition-opacity ${view === 'main' ? 'text-[#d4af37]' : 'opacity-60 hover:opacity-100'}`}
            >
              <span className={`w-2 h-2 rounded-full ${view === 'main' ? 'bg-[#d4af37]' : 'border border-white/30'}`}></span>
              Randomize Tag // Randomizar Tag
            </button>
            {user && (
              <button 
                onClick={() => setView('favorites')} 
                className={`flex w-full items-center gap-3 text-sm transition-opacity group ${view === 'favorites' ? 'text-[#d4af37]' : 'opacity-60 hover:opacity-100'}`}
              >
                <span className={`w-2 h-2 rounded-full ${view === 'favorites' ? 'bg-[#d4af37]' : 'border border-white/30 group-hover:border-white/60 transition-colors'}`}></span>
                Favorites // Favoritos
              </button>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase opacity-30 tracking-widest">Account</p>
            {user ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 text-sm opacity-60">
                   <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=0D8ABC&color=fff`} className="w-5 h-5 rounded-full border border-white/20" alt="avatar" />
                   <span className="truncate">{user.displayName}</span>
                </div>
                <button 
                  onClick={logout}
                  className="flex w-full items-center gap-3 text-sm opacity-60 hover:opacity-100 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="flex w-full items-center gap-3 text-sm opacity-60 hover:opacity-100 transition-colors text-[#d4af37]"
                >
                  <LogIn className="w-4 h-4 text-[#d4af37]" /> Sign In
                </button>
            )}
          </div>
        </nav>
        
        {user && (
          <div className="mt-auto p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[11px] opacity-70">Auto-Sync Enabled</span>
            </div>
            <p className="text-[10px] opacity-40">Ready to save favorites</p>
          </div>
        )}
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {view === 'main' ? (
          <MainView onRequireLogin={() => setShowLoginModal(true)} user={user} />
        ) : (
          <FavoritesView searchTerm={searchTerm} onSearchChange={setSearchTerm} user={user} />
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#131313] border border-white/10 rounded-xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative">
             <button 
               onClick={() => setShowLoginModal(false)}
               className="absolute top-4 right-4 text-white/50 hover:text-white"
             >
               &times;
             </button>
             <h2 className="text-2xl font-serif text-[#d4af37] italic mb-2 tracking-tight">Sign In</h2>
             <p className="text-xs text-white/50 mb-6 uppercase tracking-widest leading-relaxed">Enter a username to start saving your favorites locally.</p>
             <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
               <input 
                 type="text" 
                 autoFocus
                 value={loginName}
                 onChange={(e) => setLoginName(e.target.value)}
                 className="w-full bg-black/50 border border-white/10 rounded font-mono text-sm px-4 py-3 outline-none focus:border-[#d4af37]/50 transition-colors"
                 placeholder="Username..."
                 required
               />
               <button 
                 type="submit"
                 className="bg-[#d4af37] text-black font-bold uppercase tracking-widest text-xs py-3 rounded hover:bg-white transition-colors"
               >
                 Create Local Account
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
