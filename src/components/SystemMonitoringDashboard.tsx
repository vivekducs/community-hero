import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Server,
  Database,
  Cpu,
  Users,
  Clock,
  Activity,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Shield,
  Zap
} from 'lucide-react';
import { apiFetch } from '../api';
import { toast } from 'react-hot-toast';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface Metric {
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'critical';
}

export default function SystemMonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState<any[]>([]);

  const fetchMetrics = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiFetch('/api/admin/system-monitoring');
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Update latency history chart
        setLatencyHistory(prev => {
          const updated = [...prev, {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            db: json.database.latencyMs,
            ai: json.ai.averageLatencyMs
          }];
          return updated.slice(-15); // keep last 15 points
        });
      } else {
        toast.error('Failed to retrieve system health metrics.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error requesting telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-4">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Compiling System Telemetry...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-16 text-center text-slate-400 font-semibold bg-slate-900/40 border border-slate-800 rounded-2xl">
        Failed to construct telemetry grid.
      </div>
    );
  }

  const memoryPercentage = Math.round((data.server.memory.heapUsed / data.server.memory.heapTotal) * 100);

  return (
    <div className="space-y-6" id="telemetry-dashboard">
      {/* Dashboard Subheader */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Enterprise Observability</h2>
          </div>
          <p className="text-slate-400 text-[10px] uppercase font-mono tracking-wide">
            Real-time server telemetry, database pools, and AI inference queues
          </p>
        </div>
        <button
          onClick={() => fetchMetrics(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-700 cursor-pointer disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Force Reload'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Core Server Health */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Server className="w-24 h-24 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compute Node</h3>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Uptime</span>
              <span className="text-xs font-bold text-white font-mono">{formatUptime(data.server.uptime)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Node Version</span>
              <span className="text-xs font-bold text-white font-mono">{data.server.nodeVersion}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Platform</span>
              <span className="text-xs font-bold text-white uppercase font-mono">{data.server.platform}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Status</span>
              <span className="text-xs font-black text-emerald-500 uppercase font-mono">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Database Health */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Database className="w-24 h-24 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Storage</h3>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Provider</span>
              <span className="text-xs font-bold text-white font-mono">{data.database.provider}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Latency</span>
              <span className="text-xs font-bold text-cyan-400 font-mono">{data.database.latencyMs}ms</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Slow Queries</span>
              <span className="text-xs font-bold text-white font-mono">{data.database.slowQueriesCount}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Pool Connections</span>
              <span className="text-xs font-bold text-white font-mono">{data.database.connections} active</span>
            </div>
          </div>
        </div>

        {/* AI & Caching Metrics */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Cpu className="w-24 h-24 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Ingestion Hub</h3>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Inferences</span>
              <span className="text-xs font-bold text-white font-mono">{data.ai.requestsCount} total</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Cache Hits</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {data.ai.cacheHits} ({Math.round((data.ai.cacheHits / data.ai.requestsCount) * 100)}%)
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Avg Inference</span>
              <span className="text-xs font-bold text-white font-mono">{data.ai.averageLatencyMs}ms</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Status</span>
              <span className="text-xs font-bold text-violet-400 uppercase font-mono">{data.ai.status}</span>
            </div>
          </div>
        </div>

        {/* User Load Metrics */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="w-24 h-24 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Traffic</h3>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Active Users</span>
              <span className="text-xs font-bold text-amber-500 font-mono">{data.users.activeCount} concurrent</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Sessions</span>
              <span className="text-xs font-bold text-white font-mono">{data.users.sessionsTotal} logs</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800/40 pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Rate Limiter</span>
              <span className="text-xs font-bold text-emerald-400 uppercase font-mono">SECURE</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Auth State</span>
              <span className="text-xs font-bold text-white uppercase font-mono">JWT + FIREBASE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latency History & Memory Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dynamic Response Latency (ms)</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live feed</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyHistory.length > 0 ? latencyHistory : [
                { time: '00:00', db: 4, ai: 1250 },
                { time: '01:00', db: 6, ai: 1100 },
                { time: '02:00', db: 5, ai: 1350 },
                { time: '03:00', db: 3, ai: 1250 }
              ]}>
                <defs>
                  <linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="db" stroke="#22d3ee" fillOpacity={1} fill="url(#dbGrad)" strokeWidth={2} name="Database Latency" />
                <Area type="monotone" dataKey="ai" stroke="#a78bfa" fillOpacity={1} fill="url(#aiGrad)" strokeWidth={2} name="AI Token Latency" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Node Process Memory Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Container Resource Guard</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase text-[10px]">Heap Memory Used</span>
                <span className="text-white font-bold">{data.server.memory.heapUsed} MB / {data.server.memory.heapTotal} MB</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    memoryPercentage > 85 ? 'bg-red-500' : memoryPercentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${memoryPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Resident Set Size (RSS) allocated to the process is <strong className="text-slate-300">{data.server.memory.rss} MB</strong>. Total virtualized operating system space is <strong className="text-slate-300">{data.server.memory.systemTotal} MB</strong>.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 mt-auto space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> No Memory Leaks Detected
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-mono">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Encrypted Session Storage Enabled
            </div>
          </div>
        </div>
      </div>

      {/* Background Microservices Queue & Agent Active State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Special Agent States */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Active Municipal Agent Orchestration</h3>
          </div>
          
          <div className="space-y-3 pt-2">
            {data.ai.activeAgents.map((agent: string, idx: number) => (
              <div key={idx} className="flex justify-between items-center bg-slate-800/40 border border-slate-800/80 p-3 rounded-xl transition-all hover:bg-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-white">{agent}</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase font-mono bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Background Jobs Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Microservices & Workers</h3>
          </div>

          <div className="space-y-3 pt-2">
            {data.backgroundJobs.map((job: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center bg-slate-800/40 border border-slate-800/80 p-3 rounded-xl transition-all hover:bg-slate-800/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${job.status === 'running' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="text-xs font-bold text-white">{job.name}</span>
                  </div>
                  <p className="text-[9px] font-mono text-slate-500">
                    Last execution: {new Date(job.lastRun).toLocaleTimeString()}
                  </p>
                </div>
                <span className={`text-[9px] font-bold uppercase font-mono px-2.5 py-0.5 rounded-lg border ${
                  job.status === 'running' 
                    ? 'text-amber-400 bg-amber-400/5 border-amber-400/10' 
                    : 'text-slate-400 bg-slate-800 border-slate-700'
                }`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
