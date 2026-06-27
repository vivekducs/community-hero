import React from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Heart, 
  CheckCircle2, 
  Globe2, 
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4" id="about-view">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto" id="about-hero">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy/5 text-navy dark:bg-saffron/10 dark:text-saffron text-[10px] font-bold uppercase tracking-wider"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Empowering Communities
        </motion.div>
        
        <h1 className="text-2xl md:text-3.5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          Pioneering Smart Citizens, <br />
          <span className="text-navy dark:text-saffron">Smarter Municipalities.</span>
        </h1>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
          CityMind is a modern, real-time civic engagement platform designed to transform how citizens report local urban challenges and how municipal bodies resolve them.
        </p>
      </div>

      {/* Quick Visual Mockup */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-800/20 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center" id="about-story">
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Our Mission</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Every citizen deserves safe streets, clean air, functional lighting, and reliable municipal service desks. Yet, traditional administrative pipelines are often slow, opaque, or complex.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            CityMind acts as a transparent, high-fidelity bridge. By applying cutting-edge AI dispatching algorithms and citizen-led validation protocols, we accelerate resolution speed from weeks to mere hours.
          </p>
          <div className="pt-2 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 text-[10px] font-bold bg-[#E8F5E9] text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md">
              100% Transparent Ledger
            </span>
            <span className="px-2.5 py-1 text-[10px] font-bold bg-[#E1F5FE] text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 rounded-md">
              AI Triage Matching
            </span>
          </div>
        </div>

        {/* Decorative SVG graphic describing our circular community model */}
        <div className="w-full h-56 flex items-center justify-center bg-white dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850 p-4" id="community-model">
          <svg viewBox="0 0 200 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Citizen Circle */}
            <circle cx="50" cy="50" r="24" fill="#003366" fillOpacity="0.08" stroke="#003366" strokeWidth="1.5" />
            <text x="50" y="53" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#003366" className="dark:fill-slate-300">Citizen</text>
            <circle cx="50" cy="50" r="3" fill="#003366" />

            {/* AI Dispatch System */}
            <circle cx="150" cy="50" r="24" fill="#FF9933" fillOpacity="0.08" stroke="#FF9933" strokeWidth="1.5" />
            <text x="150" y="53" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#FF9933">Gemini AI</text>
            <circle cx="150" cy="50" r="3" fill="#FF9933" />

            {/* Municipal Responder */}
            <circle cx="100" cy="120" r="24" fill="#138808" fillOpacity="0.08" stroke="#138808" strokeWidth="1.5" />
            <text x="100" y="123" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#138808">Officials</text>
            <circle cx="100" cy="120" r="3" fill="#138808" />

            {/* Circular Arrows connecting them */}
            {/* Citizen to AI */}
            <path d="M 76,42 Q 100,32 122,42" fill="none" stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 2" strokeLinecap="round" />
            <polygon points="124,42 118,39 120,45" fill="#4B5563" />

            {/* AI to Municipal */}
            <path d="M 142,71 Q 128,94 117,105" fill="none" stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 2" strokeLinecap="round" />
            <polygon points="115,107 117,101 121,104" fill="#4B5563" />

            {/* Municipal back to Citizen */}
            <path d="M 83,105 Q 72,94 58,71" fill="none" stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 2" strokeLinecap="round" />
            <polygon points="56,68 62,71 58,74" fill="#4B5563" />
          </svg>
        </div>
      </div>

      {/* Grid of Key Pillars */}
      <div className="space-y-4" id="about-pillars">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">Our Core Technological Pillars</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-3 shadow-xs">
            <span className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-lg inline-block">
              <Sparkles className="w-5 h-5 text-[#FF9933]" />
            </span>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">AI Categorization</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Reports are automatically analyzed using Gemini. We identify duplicates, pinpoint GPS locations, and categorize incident urgency with high-confidence accuracy.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-3 shadow-xs">
            <span className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg inline-block">
              <Users className="w-5 h-5 text-navy dark:text-saffron" />
            </span>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Citizen Sentinel</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Enables active community collaboration. Locals can verify reported issues, vote on urgency levels, or add constructive comments to existing reports in real-time.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-3 shadow-xs">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg inline-block">
              <ShieldCheck className="w-5 h-5 text-[#138808]" />
            </span>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Official Resolution</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Administrative dashboards provide responding officers and local municipal crews with organized task tickets, map routes, and visual proof of resolution steps.
            </p>
          </div>

        </div>
      </div>

      {/* Interactive Impact / Facts section */}
      <div className="bg-navy text-white rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-center justify-around gap-6 text-center shadow-lg" id="about-stats">
        <div className="space-y-1">
          <span className="text-3xl font-black tracking-tight text-saffron">Delhi NCR</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Active Deployment</p>
        </div>
        <div className="w-px h-10 bg-slate-700 hidden sm:block"></div>
        <div className="space-y-1">
          <span className="text-3xl font-black tracking-tight text-white">100%</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Real-Time Sync</p>
        </div>
        <div className="w-px h-10 bg-slate-700 hidden sm:block"></div>
        <div className="space-y-1">
          <span className="text-3xl font-black tracking-tight text-white">14.8K+</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Resolved Reports</p>
        </div>
      </div>

      {/* Bottom CTA block */}
      <div className="text-center pt-2" id="about-cta">
        <Link 
          to="/report" 
          className="inline-flex items-center gap-2 h-10 px-6 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.01] cursor-pointer"
        >
          Get Started
          <ChevronRight className="w-4 h-4 text-[#FF9933]" />
        </Link>
      </div>
    </div>
  );
}
