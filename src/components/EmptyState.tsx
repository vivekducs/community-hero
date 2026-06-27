import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Search, MapPin, Info } from 'lucide-react';

interface EmptyStateProps {
  city?: string;
  category?: string;
  status?: string;
  searchQuery?: string;
  onClearFilters?: () => void;
}

export default function EmptyState({
  city = 'All',
  category = 'All',
  status = 'All',
  searchQuery = '',
  onClearFilters
}: EmptyStateProps) {
  const isFiltered = category !== 'All' || status !== 'All' || searchQuery.trim() !== '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-6 max-w-xl mx-auto my-4 shadow-sm"
      id="empty-state-card"
    >
      {/* Custom Responsive SVG Illustration */}
      <div className="w-56 h-56 relative flex items-center justify-center select-none" id="illustration-container">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sky background blob */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="#F4F6F8"
            className="fill-slate-100 dark:fill-slate-800/50 transition-colors duration-300"
          />

          {/* Background hills */}
          <path
            d="M20,125 Q60,110 100,125 T180,125 L180,180 L20,180 Z"
            fill="#E2E8F0"
            className="fill-slate-200 dark:fill-slate-700/40 transition-colors duration-300"
          />

          {/* Background tiny modern buildings */}
          <rect
            x="45"
            y="95"
            width="22"
            height="35"
            rx="3"
            fill="#003366"
            fillOpacity="0.08"
            stroke="#003366"
            strokeWidth="1.5"
            strokeOpacity="0.3"
            className="dark:stroke-slate-500 dark:fill-slate-500/10"
          />
          <rect
            x="135"
            y="85"
            width="25"
            height="45"
            rx="3"
            fill="#003366"
            fillOpacity="0.08"
            stroke="#003366"
            strokeWidth="1.5"
            strokeOpacity="0.3"
            className="dark:stroke-slate-500 dark:fill-slate-500/10"
          />

          {/* Clean Road */}
          <path
            d="M35,145 L165,145 L150,115 L50,115 Z"
            fill="#CBD5E1"
            className="fill-slate-300 dark:fill-slate-600 transition-colors duration-300"
          />
          {/* Road dashed center lines */}
          <line
            x1="100"
            y1="118"
            x2="100"
            y2="142"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            className="stroke-slate-100 dark:stroke-slate-400"
          />

          {/* Animated Clouds drifting */}
          <motion.path
            d="M30,65 Q35,55 45,60 Q55,55 60,65 Q65,70 60,75 Q55,80 30,80 Z"
            fill="#FFFFFF"
            className="fill-white dark:fill-slate-600 transition-colors duration-300"
            animate={{ x: [-6, 6, -6] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          />
          <motion.path
            d="M130,55 Q135,45 145,50 Q155,45 160,55 Q165,60 160,65 Q155,70 130,70 Z"
            fill="#FFFFFF"
            className="fill-white dark:fill-slate-600 transition-colors duration-300"
            animate={{ x: [4, -4, 4] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          />

          {/* Shining Saffron Sun */}
          <circle
            cx="100"
            cy="55"
            r="12"
            fill="#FF9933"
            className="fill-[#FF9933] opacity-90"
          />
          {/* Pulsing Sun Rays */}
          <motion.circle
            cx="100"
            cy="55"
            r="16"
            fill="none"
            stroke="#FF9933"
            strokeWidth="1.5"
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.2, 0.7] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />

          {/* Clean Environment Trees */}
          <g id="tree-left" transform="translate(18, 0)">
            <rect x="15" y="110" width="3.5" height="15" fill="#78350F" />
            <circle cx="16.5" cy="103" r="10" fill="#138808" />
          </g>
          <g id="tree-right" transform="translate(145, 0)">
            <rect x="15" y="105" width="4" height="20" fill="#78350F" />
            <circle cx="17" cy="96" r="12" fill="#138808" />
            {/* Tiny saffron fruit on tree representing vibrant health */}
            <circle cx="12" cy="92" r="2" fill="#FF9933" />
            <circle cx="21" cy="98" r="2" fill="#FF9933" />
          </g>

          {/* Sparkling Clean stars */}
          <motion.path
            d="M 68,90 L 70,93 L 73,94 L 70,95 L 68,98 L 66,95 L 63,94 L 66,93 Z"
            fill="#FF9933"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.2 }}
          />
          <motion.path
            d="M 125,110 L 127,113 L 130,114 L 127,115 L 125,118 L 123,115 L 120,114 L 123,113 Z"
            fill="#138808"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.2, 0.9] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.7 }}
          />

          {/* Large Bobbing Location Pin with Checkmark */}
          <motion.g
            animate={{ y: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            {/* Pin shadow */}
            <ellipse
              cx="100"
              cy="124"
              rx="12"
              ry="3.5"
              fill="#000000"
              fillOpacity="0.12"
              className="dark:fill-white/5"
            />
            {/* The main brand navy pin */}
            <path
              d="M100,74 C88,74 78,84 78,96 C78,110 100,128 100,128 C100,128 122,110 122,96 C122,84 112,74 100,74 Z"
              fill="#003366"
              className="fill-navy"
            />
            {/* Bright internal circle with checkmark representing clear, verified space */}
            <circle cx="100" cy="93" r="10" fill="#FFFFFF" />
            <path
              d="M95,93 L98.5,96.5 L105.5,89.5"
              fill="none"
              stroke="#138808"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
        </svg>
      </div>

      {/* Structured Text Info */}
      <div className="space-y-2.5 px-4" id="empty-state-text">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight" id="empty-state-title">
          {searchQuery ? (
            <span className="flex items-center justify-center gap-1.5">
              <Search className="w-5 h-5 text-navy dark:text-saffron shrink-0" />
              No matching issues found
            </span>
          ) : category !== 'All' ? (
            <span className="flex items-center justify-center gap-1.5">
              <Info className="w-5 h-5 text-accent-green shrink-0" />
              All Clear for {category}!
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <MapPin className="w-5 h-5 text-saffron shrink-0" />
              {city === 'All' ? 'Every Zone' : city} is Sparkling Clean!
            </span>
          )}
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto" id="empty-state-description">
          {searchQuery ? (
            `We couldn't find any issues matching "${searchQuery}" in ${city === 'All' ? 'the active cities' : city}. Try searching for other key terms.`
          ) : isFiltered ? (
            `There are currently no active reported incidents listed under "${category}" or matching your current status/city filters.`
          ) : (
            `No public incidents have been reported in ${city === 'All' ? 'any city zone' : city} yet. The streets are clean, and utilities are operating perfectly!`
          )}
        </p>
      </div>

      {/* Brand Color CTA Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center px-4 pt-1" id="empty-state-actions">
        {isFiltered && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-10 px-4 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        )}
        <Link
          to="/report"
          className="h-10 px-5 bg-navy hover:bg-navy-hover text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Be the First to Report
        </Link>
      </div>
    </motion.div>
  );
}
