import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  Building2, 
  AlertTriangle,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Support() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('Platform Bug Report');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    // Simulate real server tick
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      setMessage('');
    }, 900);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4" id="support-view">
      {/* Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto" id="support-header">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy/5 text-navy dark:bg-saffron/10 dark:text-saffron text-[10px] font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          Active Helpdesk
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Contact Support &amp; Help
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
          Have an inquiry, administrative question, or running into platform bugs? Contact our municipal technical dispatch crew.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6" id="support-grid">
        
        {/* Left Column - Contact Form (Spans 3/5) */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm" id="support-form-container">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.form 
                key="support-form"
                onSubmit={handleSubmit} 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-navy dark:text-saffron" />
                  Submit a Ticket
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full h-10 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent dark:focus:ring-saffron transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full h-10 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent dark:focus:ring-saffron transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent dark:focus:ring-saffron transition-all"
                  >
                    <option value="Platform Bug Report">Platform Bug / UI Error</option>
                    <option value="Municipal Coordination">Municipal Coordination Request</option>
                    <option value="Authority Badge Request">Official Badge / Security Verification</option>
                    <option value="Privacy / Data removal">Data Deletion request</option>
                    <option value="Other">Other General Query</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Message Description</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or coordination requirement in detail so our city dispatch team can address it..."
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent dark:focus:ring-saffron transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#FF9933]" />
                      Send Message
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="support-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Message Received</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Thank you! Your ticket ({Math.floor(Math.random() * 90000 + 10000)}) has been logged in our active responder console. Our technical team responds within 24 hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Send Another Message
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column - Info Panel (Spans 2/5) */}
        <div className="md:col-span-2 space-y-5" id="support-info-container">
          
          {/* Quick Contact Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-50 dark:border-slate-800 pb-2">
              Contact Details
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-xs">
                <Mail className="w-4 h-4 text-navy dark:text-saffron shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">General Support</p>
                  <a href="mailto:support@citymind.gov" className="text-[11px] text-slate-500 dark:text-slate-400 hover:underline">support@citymind.gov</a>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <Building2 className="w-4 h-4 text-[#138808] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">Municipal HQ</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    Central Secretariat, ITO, <br />
                    New Delhi, Delhi 110002
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <Phone className="w-4 h-4 text-[#FF9933] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">Civic Helpline</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">1800-11-2233 (Toll Free)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick FAQ / Helper */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-xl space-y-3 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-50 dark:border-slate-800 pb-2">
              Helpful Tips
            </h3>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">How do I verify duplicate reports?</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  Our system uses 100m GPS geohash matching. If a duplicate exists, it is marked automatically and you can vote on it to merge.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">How to request official authority badge?</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  Submit a badge ticket using the form on the left with your official municipal email and credentials.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
