import { useState, useEffect } from 'react';
import { 
  Bot, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../api';

interface Agent {
  id: string;
  name: string;
  description: string;
  priority: number;
  health: 'healthy' | 'unhealthy';
  healthDetails?: string;
}

interface AgentLog {
  logId: string;
  agentId: string;
  agentName: string;
  workflowId?: string;
  issueId?: string;
  startedAt: string;
  durationMs: number;
  input: any;
  output: any;
  confidence: number;
  reasoning: string;
  errors: string[];
  retries: number;
  status: 'success' | 'failed';
}

export function AgentActivityTerminal() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);

  const fetchData = async () => {
    try {
      const [registryRes, logsRes] = await Promise.all([
        apiFetch('/api/agents/registry'),
        apiFetch('/api/agents/logs?limit=15')
      ]);

      if (registryRes.ok) {
        const registryData = await registryRes.json();
        setAgents(registryData);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      console.error('Failed to retrieve agent telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleManualTrigger = async (type: 'escalation' | 'insights') => {
    setRefreshing(true);
    try {
      const res = await apiFetch(`/api/agent/${type}`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(`Manual agent trigger failed for ${type}:`, err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center h-80 shadow-sm">
        <Activity className="w-8 h-8 text-blue-950 animate-pulse mb-3" />
        <p className="text-slate-500 text-xs font-semibold">Connecting to CityMind Agent Network...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col" id="agent-telemetry-terminal">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950 text-white rounded-xl shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Agentic AI Platform Control
            </h3>
            <p className="text-xs text-slate-500">Autonomous multi-agent system state, live telemetry, and decisions audit logs</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleManualTrigger('escalation')}
            disabled={refreshing}
            className="h-9 px-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-500" />
            <span>Audit Stagnation</span>
          </button>
          
          <button
            onClick={() => handleManualTrigger('insights')}
            disabled={refreshing}
            className="h-9 px-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Generate Predictions</span>
          </button>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="h-9 w-9 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[450px]">
        {/* Left Column: Registered Agents */}
        <div className="lg:col-span-5 p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            Active Agent Registry ({agents.length})
          </h4>
          
          <div className="space-y-3.5">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                className="p-3.5 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all bg-slate-50/20 flex gap-3"
              >
                <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 h-9 w-9 flex items-center justify-center shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-xs truncate leading-none">
                      {agent.name}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 leading-none">
                      P{agent.priority}
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 leading-normal font-light">
                    {agent.description}
                  </p>

                  <div className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold">
                    <span className={`w-2 h-2 rounded-full ${agent.health === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-slate-400 font-bold uppercase">Health:</span>
                    <span className={agent.health === 'healthy' ? 'text-emerald-600' : 'text-rose-600'}>
                      {agent.health === 'healthy' ? 'Ready (Online)' : 'Degraded'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Decisions Audit Logs */}
        <div className="lg:col-span-7 p-5 flex flex-col">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-4">
            <Activity className="w-4 h-4 text-slate-400" />
            Decision logs & Explainability Ledger
          </h4>

          {logs.length === 0 ? (
            <div className="flex-1 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-slate-50/10">
              <HelpCircle className="w-6 h-6 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 font-medium">No actions logged yet in this session.</p>
              <p className="text-[10px] text-slate-400 mt-1">Submit a citizen report or run a stagnation audit to record telemetry.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div 
                  key={log.logId}
                  onClick={() => setSelectedLog(selectedLog?.logId === log.logId ? null : log)}
                  className="p-3 border border-slate-100 hover:border-slate-200 bg-white rounded-xl cursor-pointer hover:shadow-sm transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold text-slate-800">
                        {log.agentName}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.durationMs}ms
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        log.status === 'success' 
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' 
                          : 'bg-rose-50/50 text-rose-600 border-rose-100'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-light">
                    {log.reasoning}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-1.5 border-t border-slate-50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {new Date(log.startedAt).toLocaleTimeString()}
                    </span>

                    <span className={`font-bold flex items-center gap-1 ${
                      log.confidence >= 80 ? 'text-emerald-600' : log.confidence >= 50 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      Confidence: {log.confidence}%
                    </span>
                  </div>

                  {/* Expanded detail box */}
                  <AnimatePresence>
                    {selectedLog?.logId === log.logId && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-2.5"
                      >
                        <div className="bg-slate-950 text-emerald-400 p-3 rounded-lg font-mono text-[10px] space-y-2 leading-relaxed shadow-inner border border-slate-800">
                          <div>
                            <span className="text-slate-500">// Action parameters:</span>
                            <pre className="text-slate-300 mt-1 whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(log.input, null, 2)}
                            </pre>
                          </div>
                          {log.output && (
                            <div>
                              <span className="text-slate-500">// Output telemetry:</span>
                              <pre className="text-slate-300 mt-1 whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(log.output, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.errors.length > 0 && (
                            <div className="text-rose-400">
                              <span className="text-rose-500">// Execution errors:</span>
                              <pre className="mt-1 whitespace-pre-wrap">
                                {log.errors.join('\n')}
                              </pre>
                            </div>
                          )}
                          <div className="text-slate-500 border-t border-slate-800/60 pt-2 flex justify-between">
                            <span>retries: {log.retries}</span>
                            <span>ID: #{log.logId}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
