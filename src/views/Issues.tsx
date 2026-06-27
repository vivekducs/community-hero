import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useIssueStore } from '../store';
import { Issue } from '../types';
import EmptyState from '../components/EmptyState';
import { 
  Search, 
  MapPin, 
  ThumbsUp, 
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
  Filter,
  CheckCircle,
  X,
  Eye,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'react-hot-toast';
import L from 'leaflet';

// Leaflet category marker configuration
const getStatusIcon = (status: string, category: string) => {
  let emoji = '📍';
  switch (category) {
    case 'Roads': emoji = '🔧'; break;
    case 'Water': emoji = '💧'; break;
    case 'Traffic': emoji = '🚦'; break;
    case 'Healthcare': emoji = '🏥'; break;
    case 'Education': emoji = '🏫'; break;
    case 'Waste': emoji = '🗑️'; break;
    case 'Electricity': emoji = '⚡'; break;
  }

  let color = 'bg-slate-500';
  if (status === 'reported' || status === 'verifying' || status === 'verified') {
    color = 'bg-saffron'; // saffron (pending/verifying)
  } else if (status === 'investigating' || status === 'resolving' || status === 'assigned' || status === 'Assigned') {
    color = 'bg-navy'; // navy (in-progress)
  } else if (status === 'resolved') {
    color = 'bg-accent-green'; // success green
  }

  return L.divIcon({
    html: `<div class="w-8 h-8 rounded-full ${color} text-white flex items-center justify-center text-sm shadow-md border-2 border-white ring-2 ring-slate-900/5 font-sans">${emoji}</div>`,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

// Component to dynamically set map viewport
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

// INDIAN CITIES DEFINITION
const INDIAN_CITIES = [
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 }
];

const getCityDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return 12742 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // Distance in km
};

export default function Issues() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { issues, setIssues } = useIssueStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync URL search query parameters with the searchQuery state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam !== null) {
      setSearchQuery(searchParam);
    }
  }, [location.search]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list'); // Mobile toggle
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.7041, 77.1025]); // Default to Delhi NCR
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSelectedCity('All');
    navigate('/issues', { replace: true });
  };

  // 1. Subscribe to real-time changes of the Firestore Issues collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'issues'), (snapshot) => {
      const list: Issue[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Issue);
      });
      // Sort issues by newest first
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setIssues(list);
      setLoading(false);
    }, (error) => {
      console.error("Firestore live issues listener error:", error);
      toast.error("Could not bind real-time issues synchronizer.");
      setLoading(false);
    });

    return () => unsub();
  }, [setIssues]);

  // 2. Center map when selected city changes
  useEffect(() => {
    const city = INDIAN_CITIES.find(c => c.name === selectedCity);
    if (city) {
      setMapCenter([city.lat, city.lng]);
    }
  }, [selectedCity]);

  // 3. Fetch User Geolocation to center the map automatically
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          // Find closest city
          let closest = INDIAN_CITIES[0].name;
          let minDist = Infinity;
          INDIAN_CITIES.forEach(c => {
            const d = getCityDistance(position.coords.latitude, position.coords.longitude, c.lat, c.lng);
            if (d < minDist) {
              minDist = d;
              closest = c.name;
            }
          });
          setSelectedCity(closest);
        },
        () => {
          // Fallback silently to selectedCity
        }
      );
    }
  }, []);

  // Filter computation
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.subcategory.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || issue.status.toLowerCase() === selectedStatus.toLowerCase();

    let matchesCity = true;
    if (selectedCity !== 'All') {
      const city = INDIAN_CITIES.find(c => c.name === selectedCity);
      if (city) {
        const d = getCityDistance(issue.location.lat, issue.location.lng, city.lat, city.lng);
        matchesCity = d <= 80; // Issues within 80km of the selected city
      }
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesCity;
  });

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-navy bg-navy/10 border-navy/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'bg-accent-green text-white';
      case 'in progress':
      case 'resolving':
        return 'bg-saffron text-white';
      case 'assigned':
        return 'bg-navy text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const handleFocusIssueOnMap = (issue: Issue) => {
    setMapCenter([issue.location.lat, issue.location.lng]);
    setActiveTab('map');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] relative space-y-4" id="issues-hub-container">
      <Toaster position="top-right" />

      {/* Action / Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-4 shrink-0" id="issues-filters-panel">
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search incident logs by title, category, or subcategory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all duration-150"
          />
        </div>

        {/* Filters and View Toggles */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* City Dropdown */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="h-11 px-3.5 text-xs font-bold bg-navy/10 border border-navy/20 rounded-xl text-navy focus:outline-none cursor-pointer hover:bg-navy/20 transition-all shrink-0"
          >
            <option value="All">All Cities</option>
            {INDIAN_CITIES.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-11 px-3.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-100/50 transition-all"
          >
            <option value="All">All Categories</option>
            <option value="Roads">Roads</option>
            <option value="Water">Water</option>
            <option value="Electricity">Electricity</option>
            <option value="Waste">Waste</option>
            <option value="Traffic">Traffic</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Education">Education</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-11 px-3.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-100/50 transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="assigned">Assigned</option>
            <option value="in progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Quick Add Report Button */}
          <Link 
            to="/report" 
            className="h-11 px-4 bg-navy hover:bg-navy-hover text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Report
          </Link>

          {/* Mobile View Toggle */}
          <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 md:hidden shrink-0 ml-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'list' ? 'bg-white shadow text-navy font-bold' : 'text-slate-500'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'map' ? 'bg-white shadow text-navy font-bold' : 'text-slate-500'
              }`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Split Directory Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 overflow-hidden min-h-0 relative">
        
        {/* Left Side: Directory Scroll List */}
        <div className={`md:col-span-2 flex flex-col space-y-3 overflow-y-auto pr-1 h-full min-h-0 ${
          activeTab === 'list' ? 'block' : 'hidden md:block'
        }`} id="directory-scroll-pane">
          {loading ? (
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 flex gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-slate-200 shrink-0"></div>
                <div className="space-y-2 flex-1 min-w-0 py-1">
                  <div className="flex gap-1.5">
                    <div className="h-4 w-12 bg-slate-200 rounded-md"></div>
                    <div className="h-4 w-16 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded mt-2"></div>
                  <div className="space-y-1.5 mt-3">
                    <div className="h-3 w-full bg-slate-200 rounded"></div>
                    <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredIssues.length === 0 ? (
            <EmptyState 
              city={selectedCity} 
              category={selectedCategory} 
              status={selectedStatus} 
              searchQuery={searchQuery}
              onClearFilters={handleClearFilters}
            />
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.issue_id}
                onClick={() => handleFocusIssueOnMap(issue)}
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all duration-200 flex gap-4 relative group"
              >
                {/* Proof Thumbnail Image */}
                {issue.image_urls && issue.image_urls.length > 0 ? (
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                    <img 
                      src={issue.image_urls[0]} 
                      alt={issue.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-slate-300" />
                  </div>
                )}

                {/* Info Block */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border rounded-md ${getSeverityStyle(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md text-white uppercase tracking-wider ${getStatusColor(issue.status)}`}>
                      {issue.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-navy transition-colors line-clamp-1 truncate">
                    {issue.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {issue.description || "No further details logged by the reporter."}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
                    <span className="flex items-center gap-1 max-w-[120px] truncate">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{issue.location.lat.toFixed(4)}°, {issue.location.lng.toFixed(4)}°</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5 text-saffron shrink-0" />
                      <span className="text-slate-700 font-bold">{issue.upvotes || 0} confirmations</span>
                    </span>
                  </div>
                </div>

                {/* Overlay Action Button to go to Details directly */}
                <Link 
                  to={`/issues/${issue.issue_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-navy hover:bg-navy/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
                  title="View Detail Page"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Map Canvas */}
        <div className={`md:col-span-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner h-full relative z-10 ${
          activeTab === 'map' ? 'block' : 'hidden md:block'
        }`} id="map-canvas-pane">
          {loading ? (
             <div className="w-full h-full bg-slate-200 animate-pulse flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-navy animate-spin mb-4" />
                <p className="text-sm font-semibold text-slate-500">Loading map data...</p>
             </div>
          ) : (
            <MapContainer 
              center={mapCenter} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} />
              {filteredIssues.map((issue) => (
                <Marker 
                  key={issue.issue_id} 
                  position={[issue.location.lat, issue.location.lng]}
                  icon={getStatusIcon(issue.status, issue.category)}
                >
                  <Popup className="citymind-popup">
                    <div className="min-w-[210px] font-sans overflow-hidden rounded-lg shadow-sm" id={`popup-${issue.issue_id}`}>
                      <div className="bg-navy px-3 py-2 text-white flex justify-between items-center gap-2">
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded bg-white/20 text-white`}>
                          {issue.severity}
                        </span>
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded bg-slate-900/40 text-white`}>
                          {issue.status}
                        </span>
                      </div>
                      <div className="p-3 space-y-2.5 bg-white">
                        <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{issue.title}</h4>
                        
                        {issue.image_urls?.[0] && (
                          <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-100">
                            <img 
                              src={issue.image_urls[0]} 
                              alt="Thumbnail" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                      <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-2 font-medium">
                        <span className="text-slate-400">Category: <span className="font-semibold text-slate-700">{issue.category}</span></span>
                        <Link 
                          to={`/issues/${issue.issue_id}`}
                          className="font-bold text-navy hover:text-navy-hover flex items-center gap-0.5"
                        >
                          Details
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

      </div>
    </div>
  );
}
