import { useState, useEffect, ReactNode } from 'react';
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
  Leaf
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

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300" id="layout-root">
      
      {showInstallBanner && (
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between sm:px-6 lg:px-8 z-50 shadow-md animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-emerald-200" />
            <p className="text-sm font-semibold">
              Install CityMind for offline reporting & faster access!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-white text-emerald-600 font-bold text-xs rounded-lg shadow-sm hover:bg-emerald-50 transition-colors"
            >
              Install App
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-500 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300" id="header-container">
        <div className="flex items-center gap-3">
          <button 
            id="mobile-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-500 dark:text-slate-400 rounded-lg md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link to="/" className="flex items-center gap-3" id="logo-link">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm relative">
              <Settings className="w-5 h-5" />
              <Leaf className="w-3 h-3 absolute bottom-1 right-1 text-emerald-100" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">
              City<span className="text-teal-500 font-bold">Mind</span>
            </span>
          </Link>
        </div>

        {/* Search and User Section */}
        <div className="flex items-center gap-4" id="header-actions">
          <div className="relative hidden sm:block max-w-xs md:max-w-md w-64" id="search-bar-container">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Search city issues or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200"
            />
          </div>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-4" id="user-profile-menu">
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative transition-colors duration-150">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                <Link to="/profile" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">{user.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{user.is_authority ? 'City Authority' : 'Citizen Sentinel'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-emerald-100 dark:ring-emerald-900 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </Link>
                
                <button
                  id="btn-logout-header"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors hidden sm:block"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2" id="auth-buttons-header">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-sm transition-all duration-150">
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
          className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[200px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 ${
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
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
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
                  <div className={`w-2 h-2 rounded-full ${user.is_authority ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
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
          <footer className="h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between shrink-0 hidden md:flex" id="desktop-footer">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Systems Nominal</span>
              </div>
              <span className="text-xs text-slate-300 dark:text-slate-700">|</span>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">GCP CLOUD RUN: citymind-backend-active</p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-500 rounded-full"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-tighter">8.2GB / 12GB FL Firestore Used</span>
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
                active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <IconComponent className={`min-w-[24px] min-h-[24px] w-6 h-6 mb-1 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
              {item.name === 'Live Map & Issues' ? 'Map' : item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
