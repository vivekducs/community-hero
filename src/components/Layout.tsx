import { useState, ReactNode } from 'react';
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
  PlusCircle 
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentPath = location.pathname;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Report Issue', path: '/report', icon: PlusCircle },
    { name: 'Live Map & Issues', path: '/issues', icon: Map },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans" id="layout-root">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 md:px-8 border-b border-slate-200 bg-white" id="header-container">
        <div className="flex items-center gap-3">
          <button 
            id="mobile-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-500 rounded-lg md:hidden hover:bg-slate-100 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link to="/" className="flex items-center gap-3" id="logo-link">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              Community Hero
            </span>
          </Link>
        </div>

        {/* Search and User Section */}
        <div className="flex items-center gap-4" id="header-actions">
          <div className="relative hidden sm:block max-w-xs md:max-w-md w-64" id="search-bar-container">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search city issues or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {user ? (
            <div className="flex items-center gap-4" id="user-profile-menu">
              <button className="p-2 text-slate-400 hover:text-slate-600 relative transition-colors duration-150">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <Link to="/profile" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-slate-800 leading-none">{user.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{user.is_authority ? 'City Authority' : 'Citizen Sentinel'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-indigo-100 bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </Link>
                
                <button
                  id="btn-logout-header"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors hidden sm:block"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2" id="auth-buttons-header">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all duration-150">
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
          className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200 transition-transform duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between h-16 px-6 md:hidden border-b border-slate-100">
            <span className="font-bold text-lg text-slate-900">Navigation</span>
            <button 
              id="mobile-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-slate-500 rounded-lg hover:bg-slate-100"
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
                      ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="p-4 border-t border-slate-200">
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Authority Badge</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.is_authority ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                  <p className="text-sm font-medium text-slate-700">
                    {user.is_authority ? 'Official Responder' : 'Verified Sentinel'}
                  </p>
                </div>
              </div>
              <button
                id="btn-logout-sidebar"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-all duration-150"
              >
                <LogOut className="w-5 h-5 text-slate-400" />
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
          <footer className="h-14 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 hidden md:flex" id="desktop-footer">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Systems Nominal</span>
              </div>
              <span className="text-xs text-slate-300">|</span>
              <p className="text-xs font-medium text-slate-500 tracking-wide">GCP CLOUD RUN: citymind-backend-active</p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-indigo-500 rounded-full"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 tracking-tighter">8.2GB / 12GB FL Firestore Used</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center h-16 bg-white border-t border-slate-200 md:hidden px-2 shadow-lg" id="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              id={`mobile-nav-item-${item.name.toLowerCase().replace(/ /g, '-')}`}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors ${
                active ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <IconComponent className={`w-5 h-5 mb-1 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.name === 'Live Map & Issues' ? 'Map' : item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
