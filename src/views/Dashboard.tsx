import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Issue } from '../types';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  FileText, 
  Eye, 
  MapPin, 
  Wrench,
  Loader2,
  Calendar,
  Sparkles,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user } = useAuth();
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/dashboard/insights');
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
    if (!user) return;

    // Fetch user-reported issues from Firestore
    const q = query(collection(db, 'issues'), where('created_by', '==', user.user_id));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Issue[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Issue);
      });
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMyIssues(list);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard list error:", error);
      // Fallback: Populate list using mock issues if empty
      const mockDashboard: Issue[] = [
        {
          issue_id: 'issue_mock1',
          title: 'Deep sinkhole forming in active crossing',
          description: 'A massive pothole that has grown into a dangerous sinkhole over the last 3 days. Multiple cars have almost damaged their tires.',
          image_urls: ['https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800&fit=crop'],
          location: { lat: 26.4499, lng: 80.3319 },
          category: 'Public Works',
          subcategory: 'Pothole',
          severity: 'high',
          confidence: 96,
          status: 'verifying',
          department: 'Department of Transportation',
          created_by: user.user_id,
          created_by_name: user.name,
          upvotes: 28,
          downvotes: 1,
          verification_percentage: 65,
          escalation_level: 1,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ];
      setMyIssues(mockDashboard);
      setLoading(false);
    });

    fetchInsights();

    return () => unsub();
  }, [user]);

  const handleTriggerAnalysis = async () => {
    setTriggeringAnalysis(true);
    try {
      const response = await fetch('/api/agent/insights', { method: 'POST' });
      if (response.ok) {
        await fetchInsights();
      }
    } catch (err) {
      console.error("Error triggering insights agent:", err);
    } finally {
      setTriggeringAnalysis(false);
    }
  };

  // Status computation
  const reportedCount = myIssues.filter(i => i.status === 'reported' || i.status === 'verifying').length;
  const verifiedCount = myIssues.filter(i => i.status === 'verified').length;
  const inProgressCount = myIssues.filter(i => i.status === 'investigating' || i.status === 'resolving').length;
  const resolvedCount = myIssues.filter(i => i.status === 'resolved').length;

  const getStatusIconStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'Resolved' };
      case 'investigating':
      case 'resolving':
        return { color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'In Progress' };
      case 'verified':
        return { color: 'text-indigo-600 bg-indigo-50 border-indigo-100', label: 'Verified & Queued' };
      default:
        return { color: 'text-slate-600 bg-slate-50 border-slate-100', label: 'Verifying' };
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md uppercase">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-md uppercase">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md uppercase">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md uppercase">Low</span>;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-100';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-slate-50" id="dashboard-loader">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="mt-3 text-xs font-semibold text-slate-500">Loading your civic dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="dashboard-view">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Civic Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Track issues you reported and follow their resolution progress in real time.</p>
        </div>
        <Link 
          to="/report" 
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 self-start transition-colors"
          id="dashboard-cta-report"
        >
          <AlertTriangle className="w-4 h-4" />
          Report Another Issue
        </Link>
      </div>

      {/* Numerical Stats Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="dashboard-status-stats">
        {[
          { label: 'Awaiting Verification', count: reportedCount, icon: Clock, style: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Verified by Neighbors', count: verifiedCount, icon: CheckCircle, style: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Work In Progress', count: inProgressCount, icon: Wrench, style: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Problems Resolved', count: resolvedCount, icon: CheckCircle, style: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
        ].map((stat, i) => (
          <div key={i} className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center gap-4">
            <div className={`p-2.5 rounded-xl border ${stat.style}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold leading-none">{stat.label}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1.5">{stat.count}</h3>
            </div>
          </div>
        ))}
      </section>

      {/* Predictive AI Insights Section (Agent 4) */}
      <section className="space-y-4" id="predictive-insights-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-900">Predictive AI Insights & Trends</h2>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Generated nightly by Agent 4 using pattern analysis over the last 30 days of reported telemetry.
            </p>
          </div>
          <button
            onClick={handleTriggerAnalysis}
            disabled={triggeringAnalysis}
            className="px-4 py-2 border border-slate-200 hover:border-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-2 bg-white hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {triggeringAnalysis ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                Analyzing Telemetry...
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                Trigger Fresh Analysis
              </>
            )}
          </button>
        </div>

        {insightsLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Computing pattern models...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-400">No active predictive insights found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {insights.map((insight, idx) => {
              const content = insight.content || {};
              const priorityStyle = getPriorityStyle(insight.priority_level);
              return (
                <motion.div
                  key={insight.insight_id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Pattern Prediction
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold border rounded-md uppercase ${priorityStyle}`}>
                        {insight.priority_level || 'Medium'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 leading-snug text-base">
                      {content.title || 'Civic Infrastructure Alert'}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed font-light">
                      {content.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-50">
                    <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-50/30">
                      <span className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">
                        Preventive Action Plan
                      </span>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {content.recommendation}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-400" />
                        {insight.forecast_period || 'Next 14 Days'}
                      </span>
                      {insight.affected_zones?.[0] && (
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          {insight.affected_zones[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Issues Table list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="dashboard-table-container">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Your Reports Log</h3>
          <span className="text-xs font-semibold text-slate-400">{myIssues.length} total reports filed</span>
        </div>

        {myIssues.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No reported problems yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Improve your community! Snap a picture of local potholes, leaks or lighting concerns to start reporting.</p>
            <Link to="/report" className="inline-flex h-9 items-center justify-center px-4 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors">
              File Your First Report
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Issue Details</th>
                  <th className="py-4 px-4">Severity / Category</th>
                  <th className="py-4 px-4">Trust Index</th>
                  <th className="py-4 px-4">Live Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {myIssues.map((issue) => {
                  const statusInfo = getStatusIconStyle(issue.status);
                  return (
                    <tr key={issue.issue_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 max-w-md">
                        <div className="flex items-center gap-3">
                          {issue.image_urls?.[0] && (
                            <img 
                              src={issue.image_urls[0]} 
                              alt={issue.title} 
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-100 shrink-0" 
                            />
                          )}
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-900 line-clamp-1">{issue.title}</h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              {issue.location.lat.toFixed(4)}, {issue.location.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {getSeverityBadge(issue.severity)}
                          <p className="text-xs text-slate-500 font-semibold">{issue.category}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1 max-w-[100px]">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Verification</span>
                            <span className="font-bold text-slate-800">{issue.verification_percentage}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${issue.verification_percentage}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link 
                          to="/issues" 
                          className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 inline-flex transition-colors"
                          title="View on Map"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
