import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Issue } from '../types';
import { 
  CheckCircle, 
  Clock, 
  Wrench,
  Loader2,
  Calendar,
  Sparkles,
  Activity,
  MapPin,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../api';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const CATEGORY_COLORS: Record<string, string> = {
  'Public Works': '#003366', // navy blue
  'Water & Sanitation': '#0ea5e9', // sky-500
  'Traffic & Transit': '#f59e0b', // amber-500
  'Healthcare': '#ef4444', // red-500
  'Electricity': '#eab308', // yellow-500
  'Waste Management': '#138808', // accent green
  'Other': '#94a3b8'
};

const STATUS_COLORS: Record<string, string> = {
  'reported': '#94a3b8',
  'verifying': '#FF9933', // saffron
  'verified': '#8b5cf6',
  'investigating': '#3b82f6',
  'resolving': '#FF9933', // saffron
  'resolved': '#138808', // success green
  'closed': '#64748b'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const heatmapLayerRef = useRef<any>(null);

  useEffect(() => {
    // Fetch ALL issues for city analytics
    const unsub = onSnapshot(collection(db, 'issues'), (snapshot) => {
      const list: Issue[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Issue);
      });
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setIssues(list);
      setLoading(false);
    });

    fetchInsights();
    return () => unsub();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await apiFetch('/api/dashboard/insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Error fetching predictive insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && mapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView([26.4499, 80.3319], 12);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
      }).addTo(leafletMapRef.current);
    }

    if (leafletMapRef.current && issues.length > 0) {
      const heatData = issues.map(i => [i.location.lat, i.location.lng, 1]);
      
      if (heatmapLayerRef.current) {
        leafletMapRef.current.removeLayer(heatmapLayerRef.current);
      }
      
      // @ts-ignore
      heatmapLayerRef.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 15,
        gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
      }).addTo(leafletMapRef.current);
    }
  }, [loading, issues]);

  // Status computation
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const resolvedRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
  
  const verifiedIssues = issues.filter(i => i.verification_percentage >= 50).length;
  const verifiedRate = totalIssues > 0 ? Math.round((verifiedIssues / totalIssues) * 100) : 0;

  // Chart Data preparation
  const categoryData = Object.entries(
    issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const statusData = Object.entries(
    issues.reduce((acc, issue) => {
      const s = issue.status.toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse" id="dashboard-loading">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-3">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-64"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96"></div>
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
        </div>
        
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex flex-col gap-3 h-[130px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </div>
              <div className="mt-auto space-y-2">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-6"></div>
            <div className="h-full flex items-center justify-center pb-8">
              <div className="w-40 h-40 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-6"></div>
            <div className="h-full bg-slate-200 dark:bg-slate-700 rounded-lg pb-8"></div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl h-[400px] flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
             <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
             <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
          </div>
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-b-2xl"></div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="dashboard-view">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">CityMind Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time overview of civic issues and departmental performance.</p>
        </div>
        <div className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Last 30 Days</span>
        </div>
      </div>

      {/* Numerical Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" id="dashboard-status-stats">
        {[
          { label: 'Total Issues Reported', count: totalIssues, icon: BarChart2, style: 'text-navy bg-navy/10 dark:bg-navy/30 dark:text-blue-400 border-navy/20 dark:border-navy/40', trend: '+12% vs last month' },
          { label: 'Issues Resolved', count: resolvedIssues, icon: CheckCircle, style: 'text-[#138808] bg-[#138808]/10 dark:bg-[#138808]/30 dark:text-[#138808]/40 border-[#138808]/20 dark:border-[#138808]/40', trend: `${resolvedRate}% resolution rate` },
          { label: 'Avg Resolution Time', count: '4.2d', icon: Clock, style: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800', trend: '-1.1d vs last month' },
          { label: 'Community Verified', count: verifiedIssues, icon: Wrench, style: 'text-saffron bg-saffron/10 dark:bg-saffron/30 dark:text-saffron border-saffron/20 dark:border-saffron/40', trend: `${verifiedRate}% verification rate` }
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex flex-col gap-3 vibe-3d"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${stat.style}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold leading-tight">{stat.label}</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.count}</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                {stat.trend}
              </p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 vibe-3d">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-6">Issues by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Other']} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 vibe-3d">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-6">Issue Pipeline Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.05)'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#003366" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Heatmap Section */}
      <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl vibe-3d overflow-hidden flex flex-col h-[400px]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10 relative">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Issue Density Heatmap</h3>
            <p className="text-xs text-slate-500">Geospatial concentration of reported civic issues</p>
          </div>
        </div>
        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-900 z-0">
          <div ref={mapRef} className="w-full h-full" />
        </div>
      </section>

      {/* Predictive AI Insights Section (Agent 4) */}
      <section className="space-y-4" id="predictive-insights-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-saffron" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Predictive AI Insights</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Generated automatically based on patterns in recent civic reports.
            </p>
          </div>
        </div>

        {insightsLoading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-navy animate-spin" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Computing pattern models...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-400">No active predictive insights found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {insights.map((insight, idx) => {
              const content = insight.content || {};
              return (
                <motion.div
                  key={insight.insight_id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 vibe-3d p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-saffron flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Pattern Prediction
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-snug text-base">
                      {content.title || 'Civic Infrastructure Alert'}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                      {content.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                    <div className="bg-navy/5 dark:bg-navy/20 rounded-xl p-3 border border-navy/10 dark:border-navy/30">
                      <span className="text-[10px] font-bold uppercase text-navy dark:text-saffron block mb-1">
                        Preventive Action Plan
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {content.recommendation}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-saffron" />
                        {insight.forecast_period || 'Next 14 Days'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
