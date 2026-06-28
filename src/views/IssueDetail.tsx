import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, query, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { 
  ArrowLeft, 
  MapPin, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  User, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  ChevronDown,
  Cpu,
  Layers,
  Camera,
  AlertCircle,
  X
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../api';
import { getFriendlyErrorMessage } from '../utils/errors';

interface Comment {
  comment_id: string;
  issue_id: string;
  author_id: string;
  author_name: string;
  text: string;
  upvotes: number;
  created_at: string;
  reopen_image_url?: string;
}

interface Issue {
  issue_id: string;
  title: string;
  description: string;
  image_urls: string[];
  location: { lat: number; lng: number };
  category: string;
  subcategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: string;
  department: string;
  created_by: string;
  created_by_name: string;
  upvotes: number;
  downvotes: number;
  verification_percentage: number;
  escalation_level: number;
  created_at: string;
  assigned_to?: string;
  is_duplicate_of?: string;
}

export default function IssueDetail() {
  const { issueId } = useParams<{ issueId: string }>();
  const { user } = useAuth();
  
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [commentsLimit, setCommentsLimit] = useState(10);

  // Reopen flow states
  const [reopenReason, setReopenReason] = useState('');
  const [reopenImage, setReopenImage] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // 1. Live Snapshot Listener for the Single Issue Doc
  useEffect(() => {
    if (!issueId) return;

    const unsub = onSnapshot(doc(db, 'issues', issueId), (docSnap) => {
      if (docSnap.exists()) {
        setIssue(docSnap.data() as Issue);
      } else {
        toast.error("Issue document not found.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error listening to issue:", err);
      toast.error("Failed to load real-time updates.");
      setLoading(false);
    });

    return () => unsub();
  }, [issueId]);

  // 2. Live Snapshot Listener for Comments Subcollection
  useEffect(() => {
    if (!issueId) return;

    const commentsCol = collection(db, 'issues', issueId, 'comments');
    const unsub = onSnapshot(query(commentsCol), (snapshot) => {
      const fetchedComments: Comment[] = [];
      snapshot.forEach((docSnap) => {
        fetchedComments.push(docSnap.data() as Comment);
      });
      // Sort in-memory newest first
      fetchedComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setComments(fetchedComments);
    }, (err) => {
      console.error("Error listening to comments:", err);
    });

    return () => unsub();
  }, [issueId]);

  // 3. Check current user's existing vote state
  useEffect(() => {
    if (!issueId || !user) return;

    const checkVote = async () => {
      try {
        const voteDocId = `v_${issueId}_${user.user_id}`;
        const voteSnap = await getDoc(doc(db, 'verifications', voteDocId));
        if (voteSnap.exists()) {
          const status = voteSnap.data().status;
          setUserVote(status === 'confirm' ? 'upvote' : 'downvote');
        } else {
          setUserVote(null);
        }
      } catch (err) {
        console.error("Error checking vote state:", err);
      }
    };

    checkVote();
  }, [issueId, user, issue?.upvotes, issue?.downvotes]);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error("Please sign in to verify this issue.");
      return;
    }
    if (!issueId || !issue) return;

    // Optimistic Update
    const prevVote = userVote;
    const prevUpvotes = issue.upvotes;
    const prevDownvotes = issue.downvotes;
    const prevPercent = issue.verification_percentage;

    let nextUpvotes = prevUpvotes;
    let nextDownvotes = prevDownvotes;

    if (prevVote === voteType) {
      // Toggle off
      setUserVote(null);
      if (voteType === 'upvote') nextUpvotes = Math.max(0, nextUpvotes - 1);
      else nextDownvotes = Math.max(0, nextDownvotes - 1);
    } else {
      setUserVote(voteType);
      if (voteType === 'upvote') {
        nextUpvotes += 1;
        if (prevVote === 'downvote') nextDownvotes = Math.max(0, nextDownvotes - 1);
      } else {
        nextDownvotes += 1;
        if (prevVote === 'upvote') nextUpvotes = Math.max(0, nextUpvotes - 1);
      }
    }

    const nextTotal = nextUpvotes + nextDownvotes;
    const nextPercent = nextTotal > 0 ? Math.round((nextUpvotes / nextTotal) * 100) : 100;

    setIssue(prev => prev ? {
      ...prev,
      upvotes: nextUpvotes,
      downvotes: nextDownvotes,
      verification_percentage: nextPercent
    } : null);

    try {
      const response = await apiFetch(`/api/issues/${issueId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, vote: voteType })
      });

      if (!response.ok) {
        throw new Error("Failed to post vote to API");
      }
      
      if (!prevVote) {
        toast.success("Verification logged successfully! +10 Hero Points 🎉");
      } else {
        toast.success("Verification updated successfully!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Could not record vote: " + getFriendlyErrorMessage(err));
      // Revert optimistic state
      setUserVote(prevVote);
      setIssue(prev => prev ? {
        ...prev,
        upvotes: prevUpvotes,
        downvotes: prevDownvotes,
        verification_percentage: prevPercent
      } : null);
    }
  };

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to submit comments.");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }
    if (newComment.length > 500) {
      toast.error("Comment cannot exceed 500 characters.");
      return;
    }

    setIsSubmittingComment(true);
    const mockCommentId = 'c_temp_' + Math.random().toString(36).substr(2, 9);
    const newCommentObj: Comment = {
      comment_id: mockCommentId,
      issue_id: issueId || '',
      author_id: user.user_id,
      author_name: user.name,
      text: newComment,
      upvotes: 0,
      created_at: new Date().toISOString()
    };

    // Optimistic Update
    setComments(prev => [newCommentObj, ...prev]);
    const currentText = newComment;
    setNewComment('');

    try {
      const response = await apiFetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          author_name: user.name,
          text: currentText
        })
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }
      toast.success("Comment added!");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not post comment: " + getFriendlyErrorMessage(err));
      // Rollback optimistic comment
      setComments(prev => prev.filter(c => c.comment_id !== mockCommentId));
      setNewComment(currentText);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpvoteComment = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to upvote comments.");
      return;
    }
    if (!issueId) return;

    // Optimistic Update
    setComments(prev => prev.map(c => c.comment_id === commentId ? { ...c, upvotes: c.upvotes + 1 } : c));

    try {
      const response = await apiFetch(`/api/issues/${issueId}/comments/${commentId}/upvote`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error();
      }
    } catch (err) {
      // Revert
      setComments(prev => prev.map(c => c.comment_id === commentId ? { ...c, upvotes: Math.max(0, c.upvotes - 1) } : c));
      toast.error("Upvote failed.");
    }
  };

  const handleReopen = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to reopen this issue.");
      return;
    }
    if (!issueId || !issue) return;
    if (!reopenReason.trim()) {
      toast.error("Please provide a comment/reason for reopening this issue.");
      return;
    }
    if (!reopenImage) {
      toast.error("Please upload or select an image showing that the issue still persists.");
      return;
    }

    setIsReopening(true);
    try {
      const issueRef = doc(db, 'issues', issueId);
      const updatedUrls = [...(issue.image_urls || []), reopenImage];
      
      // Update the issue in firestore
      await updateDoc(issueRef, {
        status: 'reported',
        image_urls: updatedUrls,
        updated_at: new Date().toISOString()
      });

      // Add a comment to the issue
      const commentId = 'reopen_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'issues', issueId, 'comments', commentId), {
        comment_id: commentId,
        issue_id: issueId,
        author_id: user.user_id,
        author_name: user.name,
        text: `[REOPENED] ${reopenReason}`,
        upvotes: 0,
        created_at: new Date().toISOString(),
        reopen_image_url: reopenImage
      });

      // Create a notification for admins
      const notifId = 'notif_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'notifications', notifId), {
        notification_id: notifId,
        issue_id: issueId,
        user_id: user.user_id,
        message: `⚠️ [Incident Reopened] Issue "${issue.title}" has been reopened by ${user.name}. Reason: ${reopenReason}`,
        is_read: false,
        created_at: new Date().toISOString()
      });

      toast.success("Incident successfully reopened!");
      setReopenReason('');
      setReopenImage('');
    } catch (err: any) {
      console.error("Failed to reopen issue:", err);
      toast.error("An error occurred while reopening the issue: " + getFriendlyErrorMessage(err));
    } finally {
      setIsReopening(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-navy bg-navy/10 border-navy/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'bg-accent-green text-white';
      case 'resolving':
      case 'in progress':
      case 'investigating':
        return 'bg-saffron text-white';
      case 'assigned':
        return 'bg-navy text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center" id="detail-loader">
        <div className="w-12 h-12 border-4 border-navy border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-400">Loading issue details...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto p-6" id="detail-missing">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800">Issue Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">This civic issue may have been dismissed, resolved, or is unavailable in your selected region.</p>
        <Link to="/issues" className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white font-semibold rounded-lg transition-colors">
          Return to Issues Map
        </Link>
      </div>
    );
  }

  const mapLink = `https://www.google.com/maps/search/?api=1&query=${issue.location.lat},${issue.location.lng}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="issue-detail-view">
      <Toaster position="top-right" />

      {/* Back button and navigation */}
      <div className="flex items-center justify-between">
        <Link to="/issues" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Live Map
        </Link>
        <span className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">
          ID: {issue.issue_id}
        </span>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Image, Details, Timeline, Verification, Comments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            
            {/* Header Area */}
            <div className="p-6 md:p-8 border-b border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 text-xs font-bold border rounded-full uppercase tracking-wider ${getSeverityColor(issue.severity)}`}>
                  {issue.severity} Severity
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${getStatusColor(issue.status)}`}>
                  {issue.status}
                </span>
                <span className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-full">
                  {issue.category}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-slate-950 tracking-tight leading-tight">
                {issue.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>by <span className="text-slate-700 font-semibold">{issue.created_by_name}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(issue.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Proof Image Section */}
            {issue.image_urls && issue.image_urls.length > 0 && (
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-zoom-in group" onClick={() => setIsImageModalOpen(true)}>
                <img 
                  src={issue.image_urls[0]} 
                  alt={issue.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-xs font-semibold flex items-center gap-1 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    Click to Enlarge Proof
                  </span>
                </div>
              </div>
            )}

            {/* Description & Metadata Panel */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  {issue.description || "No further description provided by reporter."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Coordinates & GPS Location</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{issue.location.lat.toFixed(5)}°N, {issue.location.lng.toFixed(5)}°E</p>
                      <a 
                        href={mapLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-navy-hover mt-2 group"
                      >
                        Open in Google Maps
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <p className="font-semibold text-slate-800">Assigned Department</p>
                    <p className="text-xs text-slate-500 mt-0.5">{issue.department || "Determining Authority Agency..."}</p>
                  </div>
                  <div className="pt-2">
                    <p className="font-semibold text-slate-800">Response Officer</p>
                    <p className="text-xs text-slate-500 mt-0.5">{issue.assigned_to || "Unassigned"}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Timeline Process Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-navy" />
              Resolution Journey Tracker
            </h3>

            <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
              {/* Step 1: Reported */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-navy ring-4 ring-navy/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Report Submitted</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Logged in decentral public ledger. AI category classification success.</p>
                </div>
              </div>

              {/* Step 2: Assigned */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full flex items-center justify-center ${
                  issue.assigned_to ? 'bg-navy ring-4 ring-navy/10' : 'bg-slate-200 ring-4 ring-slate-50'
                }`}>
                  {issue.assigned_to && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${issue.assigned_to ? 'text-slate-800' : 'text-slate-400'}`}>Assigned to Department</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Route dispatched to corresponding local maintenance and responder unit.</p>
                </div>
              </div>

              {/* Step 3: Resolving */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full flex items-center justify-center ${
                  ['resolving', 'in progress', 'resolved'].includes(issue.status.toLowerCase()) ? 'bg-navy ring-4 ring-navy/10' : 'bg-slate-200 ring-4 ring-slate-50'
                }`}>
                  {['resolving', 'in progress', 'resolved'].includes(issue.status.toLowerCase()) && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${['resolving', 'in progress', 'resolved'].includes(issue.status.toLowerCase()) ? 'text-slate-800' : 'text-slate-400'}`}>Investigating & Resolving</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Work order created. Inspection scheduled or underway on-site.</p>
                </div>
              </div>

              {/* Step 4: Resolved */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full flex items-center justify-center ${
                  issue.status.toLowerCase() === 'resolved' ? 'bg-accent-green ring-4 ring-accent-green/10' : 'bg-slate-200 ring-4 ring-slate-50'
                }`}>
                  {issue.status.toLowerCase() === 'resolved' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${issue.status.toLowerCase() === 'resolved' ? 'text-accent-green' : 'text-slate-400'}`}>Resolved & Closed</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Resolved by authorized personnel. Sentinel-community confirm requested.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reopen Incident Portal */}
          {issue.status.toLowerCase() === 'resolved' && (
            <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6" id="reopen-portal-card">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reopen Incident Portal</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    If this civic issue is still unresolved, recurred, or the municipal action was insufficient, you can reopen it. A detailed reason and proof photo are mandatory.
                  </p>
                </div>
              </div>

              <form onSubmit={handleReopen} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Reopen Reason & Comments</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide specific details about why this issue is not fully resolved..."
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    className="w-full p-4 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all duration-150 resize-none"
                  ></textarea>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Proof Photo (Mandatory)</label>
                  
                  {reopenImage ? (
                    <div className="relative aspect-video max-w-md rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                      <img src={reopenImage} alt="Reopen proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setReopenImage('')}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-md"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setReopenImage(reader.result);
                                toast.success("Reopen proof image uploaded!");
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                          id="reopen-file-upload"
                        />
                        <label
                          htmlFor="reopen-file-upload"
                          className="flex-1 py-3 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Camera className="w-4 h-4 text-slate-500" /> Upload Custom Photo
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/50 flex justify-end">
                  <button
                    type="submit"
                    disabled={isReopening || !reopenReason.trim() || !reopenImage}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-amber-50 flex items-center gap-2"
                  >
                    {isReopening ? "Reopening Incident..." : "Reopen Incident"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6" id="comments-pane">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-navy" />
              Community Discussion ({comments.length})
            </h3>

            {/* Comment creation form */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="space-y-3">
                <textarea
                  placeholder="Share details, field updates, or municipal alerts about this problem..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full min-h-[100px] p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all duration-150 resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">{500 - newComment.length} characters left</span>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="px-5 py-2 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-lg shadow-md hover:shadow-navy/20 transition-all duration-150 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    Post Comment
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">Please <Link to="/login" className="text-navy font-bold hover:underline">sign in</Link> to contribute to the discussion.</p>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4 divide-y divide-slate-100">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium pt-4 text-center">No community updates logged yet. Be the first!</p>
              ) : (
                comments.slice(0, commentsLimit).map((comment) => (
                  <div key={comment.comment_id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-bold flex items-center justify-center">
                          {comment.author_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-700">{comment.author_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-8">
                      {comment.text}
                    </p>
                    {comment.reopen_image_url && (
                      <div className="pl-8 pt-1">
                        <div className="relative aspect-video max-w-sm rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                          <img 
                            src={comment.reopen_image_url} 
                            alt="Reopen evidence proof" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    )}
                    <div className="pl-8 flex items-center gap-3">
                      <button 
                        onClick={() => handleUpvoteComment(comment.comment_id)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-navy transition-colors"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{comment.upvotes || 0}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {comments.length > commentsLimit && (
              <button
                onClick={() => setCommentsLimit(prev => prev + 10)}
                className="w-full py-2.5 text-xs font-bold text-navy hover:text-navy-hover bg-navy/5 hover:bg-navy/10 border border-navy/10 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                Load More Comments
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Right 1 Column: Sentinel Verification Action Console */}
        <div className="space-y-8 lg:sticky lg:top-24 h-fit">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-navy" />
              Citizen Verification
            </h3>

            {/* Metrics */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span>Verification Rating</span>
                <span className="text-navy font-bold">{issue.verification_percentage}% Verified</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    issue.verification_percentage >= 70 ? 'bg-accent-green' : issue.verification_percentage >= 40 ? 'bg-saffron' : 'bg-red-500'
                  }`}
                  style={{ width: `${issue.verification_percentage}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Reporters and adjacent sentinel units vote to corroborate the existence and intensity of this issue, avoiding false-positive logs.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Has this issue been verified?</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVote('upvote')}
                  className={`py-3 px-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    userVote === 'upvote' 
                      ? 'border-accent-green bg-accent-green/10 text-accent-green shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-xs font-bold">Upvote ({issue.upvotes})</span>
                </button>

                <button
                  onClick={() => handleVote('downvote')}
                  className={`py-3 px-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    userVote === 'downvote' 
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span className="text-xs font-bold">Downvote ({issue.downvotes})</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-accent-green/10 border border-accent-green/20 rounded-xl">
              <h4 className="text-xs font-bold text-accent-green flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                🛡️ Guardian Badge
              </h4>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Confirming or rejecting problems honestly awards you +5 sentinel reliability points. Help municipal teams filter noise!
              </p>
            </div>

          </div>

          {/* AI Autonomous Agents Console Log */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-md space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-saffron" />
              Autonomous AI Agents Console
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Three stateless, idempotent municipal AI agents continuously watch, triage, and escalate this report in the public ledger.
            </p>

            <div className="space-y-4">
              {/* Agent 1: Ingestion & Dispatch */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron animate-pulse"></span>
                    Agent 1: Ingestion &amp; Dispatch
                  </span>
                  <span className="text-[10px] font-mono text-saffron bg-saffron/10 px-2 py-0.5 rounded-md font-semibold border border-saffron/30">Active</span>
                </div>
                <div className="text-slate-400 space-y-1">
                  <p>Classification: <span className="text-slate-200 font-semibold">{issue.category} &gt; {issue.subcategory}</span></p>
                  <p>Estimated Confidence: <span className="text-slate-200 font-semibold">{issue.confidence}%</span></p>
                  <p>Assigned Agency: <span className="text-slate-200 font-semibold">{issue.department}</span></p>
                </div>
              </div>

              {/* Agent 2: Duplicate Detection */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron"></span>
                    Agent 2: Duplicate Detection
                  </span>
                  <span className="text-[10px] font-mono text-saffron bg-saffron/10 px-2 py-0.5 rounded-md font-semibold border border-saffron/30">Idempotent</span>
                </div>
                <div className="text-slate-400 space-y-1">
                  {issue.status === 'Duplicate' ? (
                    <>
                      <p className="text-amber-300 font-medium">⚠️ Duplicate Match Confirmed!</p>
                      <p>Merged Into: <span className="text-slate-200 font-semibold">#{issue.is_duplicate_of?.substring(0, 10)}</span></p>
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No adjacent duplicates within 80 meters found in active ledger.</p>
                  )}
                </div>
              </div>

              {/* Agent 3: Escalation & Resolution */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${['resolved', 'resolving', 'investigating'].includes(issue.status.toLowerCase()) ? 'bg-purple-400 animate-pulse' : 'bg-slate-400'}`}></span>
                    Agent 3: Auto-Escalation
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-md font-semibold border border-purple-900/40">Scheduler</span>
                </div>
                <div className="text-slate-400 space-y-1">
                  <p>Escalation Level: <span className="text-slate-200 font-semibold">Level {issue.escalation_level}</span></p>
                  <p>Action Route: <span className="text-slate-200 font-semibold">
                    {issue.status === 'resolved' ? 'Autonomous Fix Applied' : issue.escalation_level > 1 ? 'Urgent Work Order Dispatched' : 'Monitoring citizen votes'}
                  </span></p>
                </div>
              </div>

            </div>

            {['reported', 'verifying', 'verified', 'investigating', 'resolving'].includes(issue.status) && (
              <button
                onClick={async () => {
                  try {
                    const res = await apiFetch('/api/agent/escalation', { method: 'POST' });
                    if (res.ok) {
                      toast.success("🤖 Agents Daemon Triggered: Checked consensus, promoted escalation states!");
                    } else {
                      throw new Error();
                    }
                  } catch (e) {
                    toast.error("Failed to invoke Agents Daemon.");
                  }
                }}
                className="w-full py-2.5 text-xs font-bold text-saffron hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Layers className="w-3.5 h-3.5 animate-spin-slow" />
                Trigger Agents Daemon (Cron Simulation)
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Image zoom modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsImageModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10"
            >
              <img 
                src={issue.image_urls[0]} 
                alt={issue.title} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
