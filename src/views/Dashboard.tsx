import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, 
  Clock, 
  Wrench,
  Loader2,
  Calendar,
  Sparkles,
  Activity,
  BarChart2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useIssues } from '../hooks/useIssues';
import { usePredictiveInsights } from '../hooks/usePredictiveInsights';
import { StatCard } from '../components/StatCard';
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
  ResponsiveContainer
} from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const CATEGORY_COLORS: Record<string, string> = {
  'Roads': '#003366', // navy blue
  'Water': '#0ea5e9', // sky-500
  'Traffic': '#f59e0b', // amber-500
  'Healthcare': '#ef4444', // red-500
  'Electricity': '#eab308', // yellow-500
  'Waste': '#138808', // accent green
  'Other': '#94a3b8'
};

export default function Dashboard() {
  const { user } = useAuth();
  const { issues, loading } = useIssues();
  const { insights, loading: insightsLoading } = usePredictiveInsights();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const heatmapLayerRef = useRef<any>(null);

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
  const resolvedIssues = issues.filter(i => (i.status || '').toLowerCase() === 'resolved').length;
  const resolvedRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
  
  const verifiedIssues = issues.filter(i => i.verification_percentage >= 50).length;
  const verifiedRate = totalIssues > 0 ? Math.round((verifiedIssues / totalIssues) * 100) : 0;

  // Chart Data preparation
  const categoryData = Object.entries(
    issues.reduce((acc, issue) => {
      const cat = issue.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const statusData = Object.entries(
    issues.reduce((acc, issue) => {
      const s = (issue.status || 'reported').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse" id="dashboard-loading">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-3">
            <div className="h-8 bg-slate-200 rounded-lg w-64"></div>
            <div className="h-4 bg-slate-200 rounded w-96"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
        </div>
        
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl flex flex-col gap-3 h-[130px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
                <div className="h-3 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="mt-auto space-y-2">
                <div className="h-6 bg-slate-200 rounded w-16"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="dashboard-view">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CityMind Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time overview of civic issues and departmental performance.</p>
        </div>
        <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Last 30 Days</span>
        </div>
      </div>

      {/* Reusable Stat Cards Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" id="dashboard-status-stats">
        <StatCard 
          title="Total Issues Reported"
          value={totalIssues}
          icon={<BarChart2 className="w-5 h-5" />}
          description="reported this month"
          trend={{ value: "+12%", isPositive: true }}
        />
        <StatCard 
          title="Issues Resolved"
          value={resolvedIssues}
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          description={`${resolvedRate}% resolution rate`}
          trend={{ value: "Active Response", isPositive: true }}
        />
        <StatCard 
          title="Avg Resolution Time"
          value="1.5d"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          description="stagnation auto-remedy"
          trend={{ value: "-1.1d", isPositive: true }}
        />
        <StatCard 
          title="Community Verified"
          value={verifiedIssues}
          icon={<Wrench className="w-5 h-5 text-amber-500" />}
          description={`${verifiedRate}% verification rate`}
          trend={{ value: "Trusted Data", isPositive: true }}
        />
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-6">Issues by Category</h3>
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

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-6">Issue Pipeline Status</h3>
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
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[400px] shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white z-10 relative">
          <div>
            <h3 className="text-base font-bold text-slate-900">Issue Density Heatmap</h3>
            <p className="text-xs text-slate-500">Geospatial concentration of reported civic issues</p>
          </div>
        </div>
        <div className="flex-1 w-full bg-slate-100 z-0">
          <div ref={mapRef} className="w-full h-full" />
        </div>
      </section>

      {/* Predictive AI Insights Section (Agent 4) */}
      <section className="space-y-4" id="predictive-insights-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900">Predictive AI Insights</h2>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Generated automatically based on patterns in recent civic reports.
            </p>
          </div>
        </div>

        {insightsLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-950 animate-spin" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Computing pattern models...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
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
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Pattern Prediction
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 leading-snug text-base">
                      {content.title || 'Civic Infrastructure Alert'}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed font-light">
                      {content.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-blue-950 block mb-1">
                        Preventive Action Plan
                      </span>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {content.recommendation}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-500" />
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
