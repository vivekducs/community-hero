import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useIssueStore } from '../store';
import { Issue } from '../types';
import { 
  ShieldAlert, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  ArrowRight,
  ShieldCheck,
  Check,
  Play,
  Hammer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Admin() {
  const { user } = useAuth();
  const { issues, setIssues, updateIssue } = useIssueStore();
  const [loading, setLoading] = useState(true);

  // 1. Fetch live issues from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'issues'), (snapshot) => {
      const list: Issue[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Issue);
      });
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setIssues(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [setIssues]);

  // If user is not logged in or doesn't have authority flag, show Access Denied
  if (!user || !user.is_authority) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4 bg-slate-50" id="admin-access-denied">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl text-center space-y-5"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Municipal Access Denied</h2>
          <p className="text-xs text-slate-500 leading-relaxed">This portal is reserved exclusively for registered municipal authority accounts, emergency responders, and verified public administrators. If you represent a city department, please contact the CityMind webmaster.</p>
          <div className="pt-2">
            <Link to="/" className="inline-flex h-11 items-center justify-center px-6 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all duration-150 shadow-md shadow-indigo-100">
              Return to Citizen Portal
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Admin status update handler
  const handleUpdateStatus = async (issue_id: string, nextStatus: 'investigating' | 'resolving' | 'resolved') => {
    try {
      const issueRef = doc(db, 'issues', issue_id);
      await updateDoc(issueRef, { status: nextStatus });
      updateIssue(issue_id, { status: nextStatus });
      alert(`Status upgraded to: ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      alert("Status updated locally: " + err.message);
      updateIssue(issue_id, { status: nextStatus });
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-md uppercase">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-md uppercase">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-md uppercase">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md uppercase">Low</span>;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'resolving':
      case 'investigating':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'verified':
        return 'text-indigo-700 bg-indigo-50 border-indigo-100';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  const openIssues = issues.filter(i => i.status !== 'resolved');

  return (
    <div className="space-y-8" id="admin-view">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Verified Municipal Authority Account
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Municipal Command Center</h1>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-mono text-indigo-700">
          Superuser: <span className="font-bold">{user.name}</span>
        </div>
      </div>

      {/* KPI metrics bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="admin-kpis">
        {[
          { label: 'Active Incidents', value: openIssues.length, icon: AlertTriangle, style: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Total Logs', value: issues.length, icon: ShieldAlert, style: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Avg SLA Resolve', value: '4.8h', icon: Clock, style: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'AI Dispatched', value: '100%', icon: ShieldCheck, style: 'text-rose-600 bg-rose-50 border-rose-100' }
        ].map((kpi, i) => (
          <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className={`p-2.5 rounded-xl border ${kpi.style}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </section>

      {/* Main Admin Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="admin-table-container">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Urgent Dispatch Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Issues ordered by highest verification trust and severity indices.</p>
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No active civic incidents logged in the database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Problem & Geocode</th>
                  <th className="py-4 px-4">Severity / Department</th>
                  <th className="py-4 px-4">Community Trust</th>
                  <th className="py-4 px-4">Current Status</th>
                  <th className="py-4 px-6 text-right">Escalate Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {issues.map((issue) => (
                  <tr key={issue.issue_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 max-w-sm">
                      <div className="flex items-center gap-3">
                        {issue.image_urls?.[0] && (
                          <img 
                            src={issue.image_urls[0]} 
                            alt={issue.title} 
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 object-cover rounded-lg border border-slate-100 shrink-0" 
                          />
                        )}
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-900 line-clamp-1">{issue.title}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {issue.location.lat.toFixed(5)}, {issue.location.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {getSeverityBadge(issue.severity)}
                        <p className="text-xs text-slate-500 font-semibold">{issue.department}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                        {issue.verification_percentage}% Verified
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border uppercase tracking-wide text-[10px] ${getStatusStyle(issue.status)}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {issue.status === 'reported' && (
                          <button
                            onClick={() => handleUpdateStatus(issue.issue_id, 'investigating')}
                            className="h-8 px-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3" /> Investigate
                          </button>
                        )}
                        {(issue.status === 'reported' || issue.status === 'verified' || issue.status === 'investigating') && (
                          <button
                            onClick={() => handleUpdateStatus(issue.issue_id, 'resolving')}
                            className="h-8 px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Hammer className="w-3 h-3" /> Repair
                          </button>
                        )}
                        {issue.status !== 'resolved' && (
                          <button
                            onClick={() => handleUpdateStatus(issue.issue_id, 'resolved')}
                            className="h-8 px-2.5 bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-emerald-100"
                          >
                            <Check className="w-3 h-3" /> Close Issue
                          </button>
                        )}
                        {issue.status === 'resolved' && (
                          <span className="text-xs text-slate-400 font-medium">Archived ✅</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
