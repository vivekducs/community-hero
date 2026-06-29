import React, { useState, useEffect, ReactNode, useRef } from 'react';
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
  Clock,
  Check,
  MessageSquare,
  Combine,
  Construction,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { messaging, db } from '../firebaseConfig';
import { getToken, onMessage } from 'firebase/messaging';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  writeBatch,
  addDoc,
  setDoc
} from 'firebase/firestore';
import { Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'react-hot-toast';


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

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set up Firebase notifications subscription with index-safe fallback
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('user_id', 'in', [user.user_id, 'anonymous', 'all']),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          notification_id: data.notification_id || doc.id,
          issue_id: data.issue_id || '',
          user_id: data.user_id || '',
          message: data.message || '',
          is_read: data.is_read || false,
          created_at: data.created_at || new Date().toISOString()
        });
      });
      setNotifications(list);
    }, (err) => {
      console.warn("Failed to load notifications with sorted query, falling back...", err);
      // Fallback: If query fails due to missing index, run it without orderBy
      const fallbackQuery = query(
        collection(db, 'notifications'),
        where('user_id', 'in', [user.user_id, 'anonymous', 'all'])
      );
      return onSnapshot(fallbackQuery, (snapshot) => {
        const list: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            notification_id: data.notification_id || doc.id,
            issue_id: data.issue_id || '',
            user_id: data.user_id || '',
            message: data.message || '',
            is_read: data.is_read || false,
            created_at: data.created_at || new Date().toISOString()
          });
        });
        // Sort manually client side
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotifications(list);
      });
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { is_read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      if (unreadNotifs.length === 0) return;

      const batch = writeBatch(db);
      unreadNotifs.forEach(notif => {
        const notifRef = doc(db, 'notifications', notif.notification_id);
        batch.update(notifRef, { is_read: true });
      });
      await batch.commit();
      toast.success("All notifications marked as read!");
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.notification_id);
    }
    setShowNotifDropdown(false);
    if (notif.issue_id) {
      navigate(`/issues/${notif.issue_id}`);
    }
  };

  const getNotificationIcon = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.includes('resolved') || msg.includes('remediat')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (msg.includes('assign') || msg.includes('dispatch') || msg.includes('crew')) {
      return <Construction className="w-4 h-4 text-[#FF9933]" />;
    }
    if (msg.includes('vote') || msg.includes('verif') || msg.includes('merge')) {
      return <Combine className="w-4 h-4 text-[#003366] dark:text-[#F4C430]" />;
    }
    if (msg.includes('comment') || msg.includes('discussion') || msg.includes('repl')) {
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-slate-500" />;
  };


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
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-300" id="header-container">
        <div className="flex items-center gap-3">
          <button 
            id="mobile-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 rounded-lg md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link to="/" className="flex items-center gap-3" id="logo-link">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white shadow-sm relative">
              <Settings className="w-5 h-5" />
              <Leaf className="w-3 h-3 absolute bottom-1 right-1 text-amber-500" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">
              City<span className="text-amber-500 font-bold">Mind</span>
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
              <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
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
              className="w-full h-10 pl-10 pr-3 py-2 border-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-950 transition-all duration-200"
            />
            
            {/* Recent Searches Dropdown */}
            {isSearchFocused && recentSearches.length > 0 && (
              <div 
                className="absolute left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-2 overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1"
                id="search-dropdown"
              >
                <div className="px-3.5 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 mb-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Recent Searches</span>
                  <button
                    type="button"
                    onMouseDown={handleClearAllRecents}
                    className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {recentSearches.map((term, index) => (
                    <div
                       key={index}
                       onMouseDown={() => handleSelectRecent(term)}
                       className="flex items-center justify-between px-3.5 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-slate-450 group-hover:text-slate-800 dark:group-hover:text-slate-150" />
                        <span className="font-medium">{term}</span>
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => handleDeleteRecent(e, term)}
                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-150 transition-colors"
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
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-4" id="user-profile-menu">
              <div className="relative" ref={dropdownRef} id="notifications-menu">
                <button 
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative rounded-lg transition-colors duration-150 focus:outline-none"
                  aria-label="Toggle notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-[#138808] ring-2 ring-white animate-pulse"></span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-[#1A202C] rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50 border border-slate-100 dark:border-slate-800"
                    >
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Alerts</span>
                          {notifications.filter(n => !n.is_read).length > 0 && (
                            <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-red-950/40 dark:text-red-400">
                              {notifications.filter(n => !n.is_read).length} new
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {notifications.filter(n => !n.is_read).length > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-[10px] text-slate-500 hover:text-[#003366] dark:text-gray-400 dark:hover:text-amber-400 transition-colors flex items-center gap-1 uppercase tracking-wider font-semibold"
                            >
                              <Check className="w-3 h-3" />
                              All Read
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Body */}
                      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.length === 0 ? (
                          <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3">
                              <Bell className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">Your feed is clear</p>
                            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 max-w-[200px]">You'll get real-time status updates on your reported issues here.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.notification_id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`flex gap-3.5 p-4 text-left transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 ${
                                !notif.is_read ? 'bg-slate-50/40 dark:bg-slate-900/10 border-l-2 border-[#003366] dark:border-amber-400' : ''
                              }`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  !notif.is_read 
                                    ? 'bg-[#003366]/10 text-[#003366] dark:bg-amber-500/10 dark:text-amber-400' 
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {getNotificationIcon(notif.message)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs text-slate-700 dark:text-gray-300 leading-relaxed break-words ${
                                  !notif.is_read ? 'font-medium' : ''
                                }`}>
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">
                                    {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {!notif.is_read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsRead(notif.notification_id);
                                      }}
                                      className="text-[10px] text-[#003366] dark:text-amber-400 hover:underline font-semibold"
                                    >
                                      Dismiss
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 text-center">
                        <button
                          onClick={() => setShowNotifDropdown(false)}
                          className="w-full text-center text-xs py-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors uppercase tracking-wider font-semibold"
                        >
                          Close Panel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                <Link to="/profile" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{user.is_authority ? 'City Authority' : 'Citizen'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-sm transition-all">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </Link>
                
                <button
                  id="btn-logout-header"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block"
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
                    {user.is_authority ? 'Official Responder' : 'Verified'}
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
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CityMind Platform</span>
              <span className="text-xs text-gray-300">|</span>
              <div className="flex items-center gap-4">
                <Link to="/about" className="text-xs font-medium text-slate-600 hover:text-navy hover:underline">
                  About Us
                </Link>
                <Link to="/privacy" className="text-xs font-medium text-slate-600 hover:text-navy hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/support" className="text-xs font-medium text-slate-600 hover:text-navy hover:underline">
                  Support
                </Link>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-bold text-gray-400 tracking-tighter">© 2026 CityMind</span>
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
