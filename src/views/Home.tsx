import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  ChevronRight 
} from 'lucide-react';

export default function Home() {
  // Sample featured issues data
  const featuredIssues = [
    {
      id: '1',
      title: 'Major Pothole on Pine Street',
      category: 'Public Works',
      location: '124 Pine St, Downtown',
      severity: 'high',
      status: 'verifying',
      votes: 42,
      verification: 75,
      time: '2 hours ago',
      img: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=400&h=250&fit=crop'
    },
    {
      id: '2',
      title: 'Water Leak Main Pipeline',
      category: 'Water & Sanitation',
      location: 'Oak Avenue near Park',
      severity: 'critical',
      status: 'investigating',
      votes: 89,
      verification: 95,
      time: '4 hours ago',
      img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=250&fit=crop'
    },
    {
      id: '3',
      title: 'Flickering Streetlight Lane 4',
      category: 'Electrical & Lighting',
      location: 'Westside Residential Block',
      severity: 'low',
      status: 'reported',
      votes: 12,
      verification: 40,
      time: '1 day ago',
      img: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&h=250&fit=crop'
    }
  ];

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full">Critical</span>;
      case 'high':
        return <span className="px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full">High</span>;
      case 'medium':
        return <span className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">Medium</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2.5 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full">Resolved</span>;
      case 'investigating':
        return <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-full">Investigating</span>;
      case 'verifying':
        return <span className="px-2.5 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full">Verifying</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-full">Reported</span>;
    }
  };

  return (
    <div className="space-y-12" id="home-view">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white p-8 md:p-12 lg:p-16 shadow-xl" id="hero-section">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,transparent_50%)]"></div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-semibold shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered Hyperlocal Civic Resolution
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-white"
          >
            City<span className="text-teal-200">Mind</span> - Report. Verify. Resolve.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-emerald-50 text-lg md:text-xl max-w-2xl font-light leading-relaxed"
          >
            Empowering citizens and municipal departments with intelligent triage, autonomous AI agents, and trusted local verifications to solve infrastructure problems faster.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pt-4"
          >
            <Link 
              to="/report" 
              className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold rounded-lg shadow-lg transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105"
              id="hero-cta-report"
            >
              <AlertTriangle className="w-5 h-5" />
              Report Local Issue
            </Link>
            <Link 
              to="/issues" 
              className="px-6 py-3.5 bg-transparent hover:bg-white/10 active:bg-white/20 border-2 border-teal-300 text-white font-semibold rounded-lg text-center transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105"
              id="hero-cta-map"
            >
              <MapPin className="w-5 h-5" />
              View Live Issues
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Cards Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="stats-section">
        {[
          { title: "Total Issues Logged", value: "1,482", sub: "Last 30 days", icon: AlertTriangle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { title: "Issues Resolved", value: "934", sub: "63.2% success rate", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { title: "Community Verifications", value: "4,291", sub: "Crowdsourced trust", icon: Users, color: "text-teal-600", bg: "bg-teal-50 border-teal-100" },
          { title: "AI Dispatch Accuracy", value: "98.4%", sub: "Automatic routing", icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={`p-6 rounded-2xl border bg-white shadow-sm flex items-start gap-4`}
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Featured / Live Issues */}
      <section className="space-y-6" id="featured-issues-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Featured Issues Under Verification</h2>
            <p className="text-sm text-slate-500 mt-1">Help verify these problems to escalate them to municipal departments.</p>
          </div>
          <Link to="/issues" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 transition-colors">
            View All Issues <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredIssues.map((issue, idx) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`flex flex-col bg-white rounded-2xl border overflow-hidden vibe-3d ${
                issue.status === 'resolved' ? 'border-l-4 border-l-green-500 border-slate-200' :
                ['reported', 'investigating'].includes(issue.status) ? 'border-l-4 border-l-amber-500 border-slate-200' :
                'border-slate-200'
              }`}
            >
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                <img 
                  src={issue.img} 
                  alt={issue.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {getSeverityBadge(issue.severity)}
                  {getStatusBadge(issue.status)}
                </div>
                <div className="absolute bottom-3 left-3 bg-slate-900/70 text-white backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  {issue.location}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{issue.category}</p>
                  <h4 className="text-base font-bold text-slate-900 line-clamp-1">{issue.title}</h4>
                  <p className="text-xs text-slate-400">{issue.time}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Verification Trust</span>
                    <span className="font-semibold text-slate-900">{issue.verification}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        issue.verification > 70 ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${issue.verification}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="font-semibold text-slate-800">{issue.votes}</span> community upvotes
                    </div>
                    <Link 
                      to={`/issues`} 
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
                    >
                      Verify <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works grid */}
      <section className="p-8 bg-emerald-50/50 rounded-3xl border border-emerald-50/20 grid grid-cols-1 md:grid-cols-3 gap-8" id="how-it-works-section">
        {[
          { num: "01", title: "Report Simple & AI Enhanced", desc: "Snap a photo and input minor details. Our integrated Gemini AI automatically categorizes, estimates severity, and tags the matching city department." },
          { num: "02", title: "Verify with Neighbors", desc: "Local community members vote, comment, and verify reports to eliminate false entries. Verifications raise the credibility index and escalate reports." },
          { num: "03", title: "Resolve & Close Loop", desc: "City authorities receive verified alerts with full logs. Live progress maps keep you and your neighbors fully in the loop up to resolution." }
        ].map((step, i) => (
          <div key={i} className="space-y-3">
            <span className="text-3xl font-black text-emerald-200 block">{step.num}</span>
            <h4 className="text-lg font-bold text-slate-900">{step.title}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
