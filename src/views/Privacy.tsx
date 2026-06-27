import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Lock, 
  Eye, 
  Database, 
  UserCheck, 
  Globe2, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

export default function Privacy() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4" id="privacy-view">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-150 dark:border-slate-800 pb-5" id="privacy-header">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy/5 text-navy dark:bg-saffron/10 dark:text-saffron text-[10px] font-bold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          Data Integrity
        </div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Last Updated: June 27, 2026 | Version 2.0 (Active Production)
        </p>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="privacy-intro-grid">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-2">
          <Eye className="w-5 h-5 text-navy dark:text-saffron" />
          <h3 className="text-xs font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">Absolute Transparency</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            All incident details, location coordinates, and category classifications are visible on the public map to avoid administrative bias.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-2">
          <Lock className="w-5 h-5 text-[#138808]" />
          <h3 className="text-xs font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">Secure Vault Storage</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            User credentials and administrative badges are protected under industry-grade Google Firebase Authentication and security tokens.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl space-y-2">
          <Database className="w-5 h-5 text-[#FF9933]" />
          <h3 className="text-xs font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">No Data Monetization</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            CityMind is purely public utility software. We do not sell, license, or monetize any reported user metadata or personal info.
          </p>
        </div>
      </div>

      {/* Main Content Articles */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300" id="privacy-content-articles">
        
        <section className="space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-navy dark:bg-saffron rounded-full"></span>
            1. Information We Collect
          </h2>
          <div className="text-xs space-y-2 pl-3.5 leading-relaxed font-normal text-slate-600 dark:text-slate-400">
            <p>
              When using CityMind, we store your profile parameters (such as your full name, email address, custom bio description, and security-verified badges) in secure cloud-hosted Firebase Firestore records.
            </p>
            <p>
              When reporting a local civic issue (like potholes, leaks, sanitation gaps, or faulty streetlights), you explicitly provide geographical GPS coordinate nodes (latitude and longitude), text descriptions, photos, and categories. This public data is mapped to enable communal validation and municipal remediation.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-navy dark:bg-saffron rounded-full"></span>
            2. AI Diagnostic Processing
          </h2>
          <div className="text-xs space-y-2 pl-3.5 leading-relaxed font-normal text-slate-600 dark:text-slate-400">
            <p>
              Your text description and attached incident titles are securely processed via the Google Gemini API to categorise reports and perform de-duplication checks (identifying redundant issues within 80 meters). 
            </p>
            <p>
              This automatic triage process is performed entirely on the server-side, protecting municipal databases from malicious inputs and protecting user data in transit.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-navy dark:bg-saffron rounded-full"></span>
            3. Public Maps & Location Consent
          </h2>
          <div className="text-xs space-y-2 pl-3.5 leading-relaxed font-normal text-slate-600 dark:text-slate-400">
            <p>
              Because CityMind is a collaborative community map (built with Leaflet OpenStreetMap integrations), reported pins, repair progress logs, and verified badges are publicly searchable and visible. 
            </p>
            <p>
              Your exact private residential address is never requested; instead, we only collect coordinates for public infrastructure nodes.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-navy dark:bg-saffron rounded-full"></span>
            4. User-Controlled Data Deletion
          </h2>
          <div className="text-xs space-y-2 pl-3.5 leading-relaxed font-normal text-slate-600 dark:text-slate-400">
            <p>
              Under global data regulations, users retain complete control over their profiles. You can update or wipe your account parameters, delete your reported items, or clear your local search terms at any time via your user-profile settings page.
            </p>
          </div>
        </section>

      </div>

      {/* Safety Notice block */}
      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-5 flex items-start gap-3.5" id="privacy-seal">
        <UserCheck className="w-5 h-5 text-[#138808] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Secured with Active Firebase Firestore Rules</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
            No unauthenticated user can overwrite, edit, or delete another citizen&apos;s reported incidents or verified badges. Municipal changes can only be logged by accounts authenticated with explicit City Authority credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
