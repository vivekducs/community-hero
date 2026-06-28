import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, AlertTriangle, Eye } from 'lucide-react';
import { Issue } from '../types';

interface IssueCardProps {
  issue: Issue;
  onFocusOnMap?: (issue: Issue) => void;
}

export function IssueCard({ issue, onFocusOnMap }: IssueCardProps) {
  const getSeverityStyle = (severity: string) => {
    switch (String(severity).toLowerCase()) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (String(status).toLowerCase()) {
      case 'reported':
        return 'bg-slate-500';
      case 'verifying':
      case 'resolving':
        return 'bg-amber-500';
      case 'verified':
        return 'bg-violet-500';
      case 'investigating':
      case 'assigned':
        return 'bg-blue-600';
      case 'resolved':
        return 'bg-emerald-600';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div
      onClick={() => onFocusOnMap?.(issue)}
      className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all duration-200 flex gap-4 relative group"
    >
      {/* Proof Thumbnail Image */}
      {issue.image_urls && issue.image_urls.length > 0 ? (
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
          <img 
            src={issue.image_urls[0]} 
            alt={issue.title} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-xl bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-slate-300" />
        </div>
      )}

      {/* Info Block */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border rounded-md ${getSeverityStyle(issue.severity)}`}>
            {issue.severity}
          </span>
          <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md text-white uppercase tracking-wider ${getStatusColor(issue.status)}`}>
            {issue.status}
          </span>
        </div>

        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-1 truncate">
          {issue.title}
        </h3>
        
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {issue.description || "No further details logged by the reporter."}
        </p>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
          <span className="flex items-center gap-1 max-w-[120px] truncate">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>{issue.location.lat.toFixed(4)}°, {issue.location.lng.toFixed(4)}°</span>
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-slate-700 font-bold">{issue.upvotes || 0} confirmations</span>
          </span>
        </div>
      </div>

      {/* Overlay Action Button to go to Details directly */}
      <Link 
        to={`/issues/${issue.issue_id}`}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
        title="View Detail Page"
      >
        <Eye className="w-4 h-4" />
      </Link>
    </div>
  );
}
export default IssueCard;
