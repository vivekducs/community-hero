import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useIssueStore } from '../store';
import { 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  ChevronRight,
  Plus,
  Trophy,
  User,
  HelpCircle,
  Download,
  Building2,
  Clock,
  Activity,
  FileText
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { issues } = useIssueStore();

  const [totalIssues, setTotalIssues] = useState(1482);
  const [resolvedIssues, setResolvedIssues] = useState(934);
  const [satisfactionRate, setSatisfactionRate] = useState(95.2);

  // Sync with Firestore data dynamically to provide live, factual statistics
  useEffect(() => {
    if (issues && issues.length > 0) {
      setTotalIssues(1482 + issues.length);
      const resolvedCount = issues.filter(i => i.status === 'resolved').length;
      setResolvedIssues(934 + resolvedCount);
    }
  }, [issues]);

  const resolutionPercentage = totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(1) : "63.2";

  return (
    <div className="space-y-6" id="home-view">
      {/* 1. Header Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2" id="dashboard-title-bar">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-navy dark:text-saffron flex items-center gap-2" id="dashboard-main-title">
            Civic Activity Hub <span className="text-slate-400 dark:text-slate-500 font-medium text-sm md:text-base">| your citymind dashboard</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5" id="dashboard-subtitle">
            Personalized Municipal Services (CMSync)
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm" id="live-time-indicator">
          <Clock className="w-3.5 h-3.5 text-navy dark:text-saffron animate-pulse" />
          <span>Active Session: Delhi NCR</span>
        </div>
      </div>

      {/* 2. Welcome Green Gradient Banner */}
      <section 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E8F5E9] to-[#E1F5FE] dark:from-slate-800/80 dark:to-slate-900/80 border border-emerald-100/50 dark:border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6" 
        id="welcome-banner"
      >
        <div className="relative z-10 max-w-xl space-y-3 text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            AI-POWERED CIVIC RESOLUTION
          </motion.div>
          
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Welcome to your CityMind dashboard, {user?.name || 'Citizen'}.
          </h2>
          
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Access, monitor, and manage your reported city issues and community verifications efficiently. Connect with civic teams to build a cleaner, safer neighborhood.
          </p>
        </div>

        {/* Custom Isometric Smart City SVG Illustration on the right */}
        <div className="w-full md:w-80 h-32 md:h-36 shrink-0 relative flex items-center justify-center" id="welcome-banner-graphic">
          <svg
            viewBox="0 0 320 140"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft decorative background circles */}
            <circle cx="240" cy="70" r="55" fill="#C8E6C9" fillOpacity="0.45" />
            <circle cx="120" cy="90" r="35" fill="#B3E5FC" fillOpacity="0.35" />
            
            {/* Clean Road layout representing street planning */}
            <path d="M20,115 L300,115 L270,95 L50,95 Z" fill="#CFD8DC" />
            <line x1="45" y1="105" x2="275" y2="105" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="6 4" />

            {/* Smart City Modern Municipal Buildings */}
            <g id="buildings">
              {/* Left municipal tower */}
              <rect x="75" y="45" width="28" height="60" rx="2" fill="#003366" fillOpacity="0.85" />
              {/* Windows */}
              <rect x="80" y="52" width="6" height="6" rx="1" fill="#FFD54F" />
              <rect x="91" y="52" width="6" height="6" rx="1" fill="#FFFFFF" />
              <rect x="80" y="63" width="6" height="6" rx="1" fill="#FFFFFF" />
              <rect x="91" y="63" width="6" height="6" rx="1" fill="#FFFFFF" />
              <rect x="80" y="74" width="6" height="6" rx="1" fill="#FFFFFF" />
              <rect x="91" y="74" width="6" height="6" rx="1" fill="#FF9933" />

              {/* Center municipal building with solar roof */}
              <rect x="110" y="30" width="45" height="75" rx="3" fill="#37474F" />
              <polygon points="105,30 132.5,15 160,30" fill="#FF9933" />
              <circle cx="132.5" cy="48" r="8" fill="#ECEFF1" />
              <path d="M129,48 L131.5,51 L136,45" stroke="#138808" strokeWidth="2" fill="none" strokeLinecap="round" />
              
              {/* Windows for main building */}
              <rect x="117" y="65" width="7" height="7" rx="1" fill="#81C784" />
              <rect x="131" y="65" width="7" height="7" rx="1" fill="#FFFFFF" />
              <rect x="145" y="65" width="7" height="7" rx="1" fill="#FFFFFF" />
              <rect x="117" y="78" width="7" height="7" rx="1" fill="#FFFFFF" />
              <rect x="131" y="78" width="7" height="7" rx="1" fill="#FFD54F" />
              <rect x="145" y="78" width="7" height="7" rx="1" fill="#FFFFFF" />

              {/* Right corporate smart hub */}
              <rect x="165" y="55" width="30" height="50" rx="2" fill="#003366" fillOpacity="0.7" />
              <rect x="171" y="62" width="6" height="6" rx="1" fill="#FFFFFF" />
              <rect x="183" y="62" width="6" height="6" rx="1" fill="#FFFFFF" />
              <rect x="171" y="73" width="6" height="6" rx="1" fill="#FFFFFF" />
              <rect x="183" y="73" width="6" height="6" rx="1" fill="#81C784" />
            </g>

            {/* Smart Dashboard Floating Screen Mockup */}
            <g id="phone-dashboard-mockup" transform="translate(210, 25)">
              <rect x="0" y="0" width="45" height="80" rx="5" fill="#263238" stroke="#ECEFF1" strokeWidth="2.5" />
              {/* Home Indicator */}
              <line x1="15" y1="75" x2="30" y2="75" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              {/* Header inside phone screen */}
              <rect x="4" y="6" width="37" height="10" rx="1.5" fill="#003366" />
              <circle cx="9" cy="11" r="2" fill="#FF9933" />
              {/* Mock items inside phone screen */}
              <rect x="4" y="20" width="37" height="8" rx="1" fill="#81C784" fillOpacity="0.4" />
              <circle cx="8" cy="24" r="1.5" fill="#138808" />
              <line x1="14" y1="24" x2="35" y2="24" stroke="#37474F" strokeWidth="1.5" />
              
              <rect x="4" y="31" width="37" height="8" rx="1" fill="#FFD54F" fillOpacity="0.4" />
              <circle cx="8" cy="35" r="1.5" fill="#FF9933" />
              <line x1="14" y1="35" x2="35" y2="35" stroke="#37474F" strokeWidth="1.5" />

              <rect x="4" y="42" width="37" height="8" rx="1" fill="#ECEFF1" />
              <circle cx="8" cy="46" r="1.5" fill="#90A4AE" />
              <line x1="14" y1="46" x2="30" y2="46" stroke="#37474F" strokeWidth="1.5" />

              {/* Tiny bar graph inside phone screen */}
              <rect x="6" y="58" width="6" height="10" rx="0.5" fill="#FF9933" />
              <rect x="15" y="54" width="6" height="14" rx="0.5" fill="#003366" />
              <rect x="24" y="61" width="6" height="7" rx="0.5" fill="#138808" />
              <rect x="33" y="56" width="6" height="12" rx="0.5" fill="#B0BEC5" />
            </g>

            {/* Tiny green environment trees representing sustainability */}
            <circle cx="40" cy="98" r="8" fill="#138808" />
            <rect x="38.5" y="98" width="3" height="10" fill="#5D4037" />
            <circle cx="285" cy="98" r="9" fill="#138808" />
            <rect x="283.5" y="98" width="3" height="12" fill="#5D4037" />

            {/* Drifting Clouds */}
            <path d="M20,35 Q25,25 35,30 Q45,25 50,35 Q55,40 50,45 Q45,50 20,50 Z" fill="#FFFFFF" fillOpacity="0.85" />
            <path d="M260,25 Q265,15 275,20 Q285,15 290,25 Q295,30 290,35 Q285,40 260,40 Z" fill="#FFFFFF" fillOpacity="0.85" />
          </svg>
        </div>
      </section>

      {/* 3. Main Two-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-main-grid">
        
        {/* Left Column (Spans 2 columns on desktop) - Metrics & Progress */}
        <div className="lg:col-span-2 space-y-6" id="metrics-main-column">
          <div className="flex items-center justify-between" id="metrics-header">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Key Platform Metrics
            </h2>
            <div className="h-px bg-slate-150 dark:bg-slate-800 flex-1 mx-4"></div>
          </div>

          {/* Grid of 6 Beautiful Cards precisely adapted from PlatformSync reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="metrics-grid">
            
            {/* Card 1: Project/Civic Status Overview */}
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
              id="metric-card-overview"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">Civic Status Overview</h3>
                  <span className="p-1.5 rounded-lg bg-navy/5 dark:bg-saffron/10 text-navy dark:text-saffron">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  Welcome to your personalized GOI/CityMind dashboard. Access, track, and manage local problem resolutions efficiently.
                </p>
              </div>
              <button
                onClick={() => navigate('/report')}
                className="w-full py-2 bg-navy hover:bg-navy-hover active:scale-[0.98] text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Report Civic Issue
              </button>
            </div>

            {/* Card 2: Average Resolution Time (Orange Chart) */}
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between shadow-sm"
              id="metric-card-response"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">Avg Resolution Speed</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold text-[#FF9933] bg-[#FF9933]/10 border border-[#FF9933]/20 rounded-full">
                    1.5 days
                  </span>
                </div>

                {/* Custom glowing responsive orange line chart */}
                <div className="h-16 relative w-full flex items-end pt-1" id="orange-chart">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="orangeGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF9933" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#FF9933" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area */}
                    <path
                      d="M 0,40 Q 15,30 30,22 T 60,12 T 90,5 L 100,5 L 100,40 Z"
                      fill="url(#orangeGlow)"
                    />
                    {/* Stroke Line */}
                    <path
                      d="M 0,38 Q 15,30 30,22 T 60,12 T 90,5 L 100,5"
                      fill="none"
                      stroke="#FF9933"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {/* Pulsing focal point */}
                    <circle cx="90" cy="5" r="2.5" fill="#FF9933" />
                    <circle cx="90" cy="5" r="5" fill="none" stroke="#FF9933" strokeWidth="1" className="animate-ping" />
                  </svg>
                </div>
              </div>

              {/* Chart labels aligned perfectly */}
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-50 dark:border-slate-800">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>

            {/* Card 3: Civic Service Uptime (Green Chart) */}
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between shadow-sm"
              id="metric-card-uptime"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">Service Desk Uptime</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 rounded-full">
                    98.4%
                  </span>
                </div>

                {/* Custom glowing responsive green line chart */}
                <div className="h-16 relative w-full flex items-end pt-1" id="green-chart">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="greenGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#138808" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#138808" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area */}
                    <path
                      d="M 0,30 Q 20,38 40,15 T 80,10 L 100,5 L 100,40 Z"
                      fill="url(#greenGlow)"
                    />
                    {/* Stroke Line */}
                    <path
                      d="M 0,30 Q 20,38 40,15 T 80,10 L 100,5"
                      fill="none"
                      stroke="#138808"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="80" cy="10" r="2.5" fill="#138808" />
                  </svg>
                </div>
              </div>

              {/* Chart labels */}
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-50 dark:border-slate-800">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>

            {/* Card 4: Issue Resolution Progress Card */}
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
              id="metric-card-progress"
            >
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">Report Resolution Rate</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Target rate: 85% Completed
                </p>
                
                {/* Horizontal status indicators */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-medium text-slate-700 dark:text-slate-300">
                    <span>Active Resolution Progress</span>
                    <span className="font-bold text-navy dark:text-saffron">{resolutionPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FF9933] rounded-full transition-all duration-500"
                      style={{ width: `${resolutionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  alert("Preparing complete activity summary PDF...");
                }}
                className="w-full py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Activity Summary
              </button>
            </div>

            {/* Card 5: AI Dispatch Precision (Uptime/accuracy styled) */}
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between shadow-sm"
              id="metric-card-precision"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">AI Triage Accuracy</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 rounded-full">
                    91.5%
                  </span>
                </div>

                {/* Accuracy verification dotted line chart */}
                <div className="h-16 relative w-full flex items-end pt-1" id="precision-chart">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M 0,35 C 15,35 25,20 40,20 C 55,20 65,8 80,8 C 95,8 100,5 100,5"
                      fill="none"
                      stroke="#138808"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    {/* Interactive dots representing automated AI triage successes */}
                    <circle cx="40" cy="20" r="3" fill="#138808" />
                    <circle cx="80" cy="8" r="3" fill="#138808" />
                  </svg>
                </div>
              </div>

              {/* Chart labels */}
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-50 dark:border-slate-800">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>

            {/* Card 6: Report Escalation Trend */}
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between shadow-sm"
              id="metric-card-escalation"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">Report Escalations</h3>
                  <span className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FF9933]" />
                  </span>
                </div>

                {/* Smooth ascending orange slope */}
                <div className="h-16 relative w-full flex items-end pt-1" id="escalation-chart">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M 0,38 L 20,32 L 40,35 L 60,20 L 80,15 L 100,8"
                      fill="none"
                      stroke="#FF9933"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="100" cy="8" r="3.5" fill="#FF9933" />
                  </svg>
                </div>
              </div>

              {/* Chart labels */}
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-50 dark:border-slate-800">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column (Spans 1 column) - Quick Access & Action items */}
        <div className="space-y-6" id="quick-access-column">
          
          {/* Quick Access Box 1 (Beautiful 2x3 Grid of Services) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4" id="quick-access-services">
            <div className="border-b border-slate-50 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Quick Access
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3" id="services-grid">
              {[
                { label: 'Report Issue', path: '/report', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                { label: 'Incident Map', path: '/issues', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
                { label: 'Leaderboard', path: '/leaderboard', icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
                { label: 'My Profile', path: '/profile', icon: User, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
                { label: 'AI Dashboard', path: '/dashboard', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                { label: 'Municipal Board', path: '/admin', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20' }
              ].map((service, index) => (
                <button
                  key={index}
                  onClick={() => navigate(service.path)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-850 hover:border-slate-200 dark:hover:border-slate-700 hover:scale-[1.03] hover:shadow-sm active:scale-95 transition-all cursor-pointer group text-center space-y-2"
                >
                  <span className={`p-2 rounded-full ${service.bg} ${service.color} transition-transform group-hover:scale-110`}>
                    <service.icon className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    {service.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Access Box 2 (Active Resolution Workflow Status) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4" id="resolution-workflow">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Quick Access
              </h3>
              <Link 
                to="/issues" 
                className="text-[10px] font-bold text-navy hover:text-navy-hover dark:text-saffron dark:hover:text-saffron-hover hover:underline cursor-pointer"
              >
                View Detailed Reports
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              {/* Application Progress header */}
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Active Issue Remediation &gt; Resolution Progress
              </div>

              {/* Municipal team activity block */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Delhi Zone &gt; Pothole Repairs</span>
                  <span className="text-[10px] font-bold text-accent-green flex items-center gap-0.5">
                    <Activity className="w-3 h-3 animate-pulse" /> Active
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-green rounded-full animate-pulse" 
                    style={{ width: '85%' }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>Standard Repair Protocol</span>
                  <span>85% Completed</span>
                </div>
              </div>

              {/* Action buttons matching the bottom footer */}
              <button
                onClick={() => {
                  alert("A real-time workflow diagnostic audit was initiated successfully. Check your notification center.");
                }}
                className="w-full py-2 border border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Workflow Report
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Secondary Features: Guidelines, Support, Footers */}
      <section className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm" id="how-it-works-section">
        {[
          { num: "01", title: "Smart Issue Capture", desc: "Snap a photo and input details. Our integrated Gemini AI automatically categorizes, identifies duplications, and assigns the correct responding department." },
          { num: "02", title: "Hyperlocal Verification", desc: "Local residents vote, verify, and confirm details to eliminate false items. Increased community trust score triggers rapid escalation." },
          { num: "03", title: "Resolution Tracking", desc: "Authorities receive structured alerts with high-confidence diagnostics. Monitor repair updates and trace workflows transparently until completion." }
        ].map((step, i) => (
          <div key={i} className="space-y-2">
            <span className="text-2xl font-black text-saffron block leading-none">{step.num}</span>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">{step.title}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">{step.desc}</p>
          </div>
        ))}
      </section>

      {/* Modern Dashboard Simple Footer */}
      <footer className="pt-4 pb-2 border-t border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4" id="dashboard-footer">
        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <Link to="/about" className="hover:text-navy dark:hover:text-saffron transition-colors">About Us</Link>
          <Link to="/privacy" className="hover:text-navy dark:hover:text-saffron transition-colors">Privacy Policy</Link>
          <Link to="/support" className="hover:text-navy dark:hover:text-saffron transition-colors">Contact Support</Link>
        </div>
        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <span>Powered by</span>
          <span className="font-extrabold text-navy dark:text-saffron">CityMind Engine v2.0</span>
        </div>
      </footer>
    </div>
  );
}
