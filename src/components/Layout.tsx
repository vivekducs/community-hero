import React, { useState, useEffect, ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  AlertTriangle, 
  Map, 
  LayoutDashboard, 
  User, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Bell, 
  PlusCircle,
  Trophy,
  Moon,
  Sun,
  Settings,
  Leaf,
  Clock
} from 'lucide-react';
import { messaging } from '../firebaseConfig';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent-searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const saveSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 6);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveSearch(searchQuery);
      navigate(`/issues?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchFocused(false);
      const input = document.getElementById('header-search-input');
      if (input) {
        (input as HTMLInputElement).blur();
      }
    }
  };

  const handleSelectRecent = (term: string) => {
    setSearchQuery(term);
    saveSearch(term);
    navigate(`/issues?search=${encodeURIComponent(term)}`);
    setIsSearchFocused(false);
  };

  const handleDeleteRecent = (e: React.MouseEvent, term: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== term);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllRecents = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recent-searches');
  };
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme-preference');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Foreground notification:', payload);
        toast.success(`[FCM] ${payload.notification?.title}: ${payload.notification?.body}`, { duration: 5000 });
      });
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme-preference', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme-preference', 'light');
    }
  }, [isDarkMode]);

  const currentPath = location.pathname;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Report Issue', path: '/report', icon: PlusCircle },
    { name: 'Live Map & Issues', path: '/issues', icon: Map },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  if (user?.is_authority) {
    navItems.push({ name: 'Admin Portal', path: '/admin', icon: ShieldAlert });
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <div className="h-screen flex flex-col bg-[#F4F6F8] dark:bg-slate-900 text-[#1F2937] dark:text-slate-100 font-sans transition-colors duration-300 overflow-hidden" id="layout-root">
      
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 md:px-8 border-b border-gray-200 bg-white shadow-sm transition-colors duration-300" id="header-container">
        <div className="flex items-center gap-3">
          <button 
            id="mobile-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-[#4B5563] rounded-lg md:hidden hover:bg-gray-100 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link to="/" className="flex items-center gap-3" id="logo-link">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#003366] text-white shadow-sm relative">
              <Settings className="w-5 h-5" />
              <Leaf className="w-3 h-3 absolute bottom-1 right-1 text-[#FF9933]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#003366]">
              City<span className="text-[#FF9933] font-bold">Mind</span>
            </span>
          </Link>
        </div>

        {/* Search and User Section */}
        <div className="flex items-center gap-4" id="header-actions">
          <form 
            onSubmit={handleSearchSubmit} 
            className="relative hidden sm:block max-w-xs md:max-w-md w-64" 
            id="search-bar-container"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-[#4B5563]" />
            </span>
            <input
              id="header-search-input"
              type="text"
              placeholder="Search city issues or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              className="w-full h-10 pl-10 pr-3 py-2 border-0 rounded-lg bg-gray-100 text-sm text-[#1F2937] placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#003366] focus:bg-white transition-all duration-200"
            />
            
            {/* Recent Searches Dropdown */}
            {isSearchFocused && recentSearches.length > 0 && (
              <div 
                className="absolute left-0 right-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-2 overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1"
                id="search-dropdown"
              >
                <div className="px-3.5 py-1.5 flex items-center justify-between border-b border-gray-100 mb-1">
                  <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">Recent Searches</span>
                  <button
                    type="button"
                    onMouseDown={handleClearAllRecents}
                    className="text-[10px] font-bold text-[#003366] hover:text-[#002244] hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {recentSearches.map((term, index) => (
                    <div
                      key={index}
                      onMouseDown={() => handleSelectRecent(term)}
                      className="flex items-center justify-between px-3.5 py-2 text-sm text-[#1F2937] hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-[#4B5563] group-hover:text-[#003366]" />
                        <span className="font-medium">{term}</span>
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => handleDeleteRecent(e, term)}
                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
                        title="Remove search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-[#4B5563] hover:text-[#003366] rounded-lg transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-4" id="user-profile-menu">
              <button className="p-2 text-[#4B5563] hover:text-[#003366] relative transition-colors duration-150">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-[#138808] ring-2 ring-white"></span>
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <Link to="/profile" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-[#1F2937] leading-none">{user.name}</p>
                    <p className="text-xs text-[#4B5563] mt-1">{user.is_authority ? 'City Authority' : 'Citizen Sentinel'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-[#003366]/10 bg-[#003366]/5 text-[#003366] font-bold flex items-center justify-center text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </Link>
                
                <button
                  id="btn-logout-header"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-[#4B5563] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors hidden sm:block"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2" id="auth-buttons-header">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-[#003366] hover:bg-gray-50 rounded-lg transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="px-4 py-2 text-sm font-semibold text-white bg-[#003366] hover:bg-[#002244] rounded-lg shadow-sm transition-all duration-150">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden" id="layout-body-wrapper">
        {/* Mobile Sidebar Back Drop */}
        {sidebarOpen && (
          <div 
            id="mobile-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden"
          ></div>
        )}

        {/* Sidebar (Tablet/Desktop) */}
        <aside 
          id="sidebar-navigation"
          className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[200px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 md:sticky md:top-0 md:h-full md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between h-16 px-6 md:hidden border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-lg text-slate-900 dark:text-slate-100">Navigation</span>
            <button 
              id="mobile-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  id={`nav-item-${item.name.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                    active 
                      ? 'bg-[#E5E7EB] dark:bg-slate-800 text-navy dark:text-saffron font-bold border-l-4 border-navy dark:border-saffron rounded-l-none pl-2 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${active ? 'text-navy dark:text-saffron' : 'text-slate-400 dark:text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Authority Badge</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.is_authority ? 'bg-red-500' : 'bg-accent-green'}`}></div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user.is_authority ? 'Official Responder' : 'Verified Sentinel'}
                  </p>
                </div>
              </div>
              <button
                id="btn-logout-sidebar"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 rounded-lg transition-all duration-150"
              >
                <LogOut className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                Sign Out
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 overflow-y-auto" id="main-content">
          <div className="flex-1 px-6 py-6 md:px-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
          
          {/* Desktop Footer matching Sleek Interface design exactly */}
          <footer className="h-14 bg-white border-t border-gray-200 px-8 flex items-center justify-between shrink-0 hidden md:flex" id="desktop-footer">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#138808] animate-pulse"></div>
                <span className="text-xs font-semibold text-[#4B5563] uppercase">Systems Nominal</span>
              </div>
              <span className="text-xs text-gray-300">|</span>
              <p className="text-xs font-medium text-[#4B5563] tracking-wide">GCP CLOUD RUN: citymind-backend-active</p>
              <span className="text-xs text-gray-300">|</span>
              <div className="flex items-center gap-4">
                <Link to="/about" className="text-xs font-medium text-[#4B5563] hover:text-[#003366] hover:underline">
                  About Us
                </Link>
                <Link to="/privacy" className="text-xs font-medium text-[#4B5563] hover:text-[#003366] hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/support" className="text-xs font-medium text-[#4B5563] hover:text-[#003366] hover:underline">
                  Support
                </Link>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-[#138808]"></div>
              </div>
              <span className="text-[10px] font-bold text-[#4B5563] tracking-tighter">8.2GB / 12GB FL Firestore Used</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 md:hidden px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none" id="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              id={`mobile-nav-item-${item.name.toLowerCase().replace(/ /g, '-')}`}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors ${
                active ? 'text-navy dark:text-saffron font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <IconComponent className={`min-w-[24px] min-h-[24px] w-6 h-6 mb-1 ${active ? 'text-navy dark:text-saffron' : 'text-slate-400 dark:text-slate-500'}`} />
              {item.name === 'Live Map & Issues' ? 'Map' : item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
