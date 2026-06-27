import { useState, useEffect, FormEvent } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useIssueStore } from '../store';
import { Issue, UserProfile } from '../types';
import { 
  ShieldAlert, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  ShieldCheck,
  Check,
  Play,
  Hammer,
  Plus,
  Trash2,
  Search,
  Filter,
  SlidersHorizontal,
  Upload,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Eye,
  Camera,
  Layers,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../api';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'On Duty' | 'Off Duty' | 'On Break';
  active_assignments: number;
  resolved_count: number;
  performance_score: number;
}

export default function Admin() {
  const { user } = useAuth();
  const { issues, setIssues } = useIssueStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'staff'>('queue');

  // --- Filter and pagination states for Queue ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'severity' | 'upvotes'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // --- Staff Management states ---
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Responder');
  const [newStaffDept, setNewStaffDept] = useState('Department of Transportation');
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // --- Selected Issue Detail Overlay Modal ---
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [adminNotes, setAdminNotes] = useState<{ id: string; text: string; created_at: string }[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // --- Preselected realistic resolution preview photos for simulation ---
  const resolvedSamplePhotos = [
    { name: 'Road Resurfaced', url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800' },
    { name: 'Water Pipe Replaced', url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=800' },
    { name: 'Sanitation Cleared', url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800' },
  ];

  // 1. Live listener for issues from Firestore
  useEffect(() => {
    const unsubIssues = onSnapshot(collection(db, 'issues'), (snapshot) => {
      const list: Issue[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Issue);
      });
      // Default newest first
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setIssues(list);
      setLoading(false);
    }, (err) => {
      console.error("Firestore issues load failed:", err);
      setLoading(false);
    });

    return () => unsubIssues();
  }, [setIssues]);

  // 2. Live listener for staff members from Firestore
  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const list: StaffMember[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as StaffMember);
      });

      // Seed mock staff members if database is currently empty to prevent a blank slate
      if (list.length === 0 && !loading) {
        const seedStaff: Omit<StaffMember, 'id'>[] = [
          { name: 'Officer Carlos Mendez', email: 'carlos.m@city.gov', role: 'Road Inspector', department: 'Department of Transportation', status: 'On Duty', active_assignments: 2, resolved_count: 14, performance_score: 4.8 },
          { name: 'Engineer Maya Lin', email: 'maya.l@city.gov', role: 'Hydraulic Tech', department: 'Water Board', status: 'On Duty', active_assignments: 1, resolved_count: 22, performance_score: 4.9 },
          { name: 'Inspector James Sterling', email: 'james.s@city.gov', role: 'Sanitation Chief', department: 'Public Sanitation', status: 'On Duty', active_assignments: 3, resolved_count: 9, performance_score: 4.4 },
        ];
        seedStaff.forEach(async (member) => {
          const fakeId = 'staff_' + Math.random().toString(36).substr(2, 9);
          await setDoc(doc(db, 'staff', fakeId), member);
        });
      }

      setStaff(list);
    }, (err) => {
      console.error("Firestore staff load failed:", err);
    });

    return () => unsubStaff();
  }, [loading]);

  // 3. Fetch admin notes / internal log comments for selected issue
  useEffect(() => {
    if (!selectedIssue) {
      setAdminNotes([]);
      return;
    }

    setLoadingNotes(true);
    const unsubNotes = onSnapshot(collection(db, 'admin_notes'), (snapshot) => {
      const list: { id: string; text: string; created_at: string }[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.issue_id === selectedIssue.issue_id) {
          list.push({ id: doc.id, text: d.text, created_at: d.created_at });
        }
      });
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAdminNotes(list);
      setLoadingNotes(false);
    });

    return () => unsubNotes();
  }, [selectedIssue]);

  // If user is not logged in or doesn't have authority flag, show Access Denied
  if (!user || !user.is_authority) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4 bg-slate-50" id="admin-access-denied">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl text-center space-y-5"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-red-600 shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Municipal Access Denied</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This portal is reserved exclusively for registered municipal authority accounts, emergency responders, and verified public administrators. If you represent a city department, please contact the CityMind administrator.
          </p>
          <div className="pt-2">
            <Link to="/" className="inline-flex h-11 items-center justify-center px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all duration-150 shadow-md">
              Return to Citizen Portal
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- KPI card calculations ---
  const myDepartment = user.department_id || 'Department of Transportation';
  const assignedIssues = issues.filter(i => i.department === myDepartment);
  
  const totalAssigned = assignedIssues.length;
  const inProgressCount = assignedIssues.filter(i => ['investigating', 'resolving', 'In Progress', 'assigned', 'Assigned'].includes(i.status)).length;
  
  const currentMonth = new Date().toISOString().substring(0, 7);
  const resolvedThisMonth = assignedIssues.filter(i => {
    if (i.status !== 'resolved') return false;
    const resolvedDate = i.resolved_at || i.created_at;
    return resolvedDate && resolvedDate.startsWith(currentMonth);
  }).length;

  // Avg SLA calculations
  let totalTime = 0;
  let resolvedCount = 0;
  assignedIssues.forEach(i => {
    if (i.status === 'resolved') {
      const start = new Date(i.created_at).getTime();
      const end = i.resolved_at ? new Date(i.resolved_at).getTime() : Date.now();
      totalTime += (end - start);
      resolvedCount++;
    }
  });
  const avgResolutionDays = resolvedCount > 0 ? parseFloat((totalTime / resolvedCount / (24 * 3600 * 1000)).toFixed(1)) : 1.8;
  const rating = 4.7; // department evaluation index

  // --- Filtering and Sorting Logic ---
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          issue.issue_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'reported') matchesStatus = issue.status === 'reported';
      else if (statusFilter === 'assigned') matchesStatus = !!issue.assigned_to_person;
      else if (statusFilter === 'in_progress') matchesStatus = issue.status === 'investigating' || issue.status === 'resolving';
      else if (statusFilter === 'resolved') matchesStatus = issue.status === 'resolved';
    }

    // Priority filter
    let matchesPriority = true;
    if (priorityFilter !== 'all') {
      matchesPriority = issue.severity === priorityFilter;
    }

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort logic
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'created_at') {
      return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * factor;
    }
    if (sortBy === 'severity') {
      const weights = { critical: 4, high: 3, medium: 2, low: 1 };
      return ((weights[b.severity] || 0) - (weights[a.severity] || 0)) * factor;
    }
    if (sortBy === 'upvotes') {
      return ((b.upvotes || 0) - (a.upvotes || 0)) * factor;
    }
    return 0;
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedIssues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIssues = sortedIssues.slice(startIndex, startIndex + itemsPerPage);

  // --- Action handlers ---

  // Status transitions
  const handleStatusChange = async (nextStatus: 'investigating' | 'resolving' | 'resolved') => {
    if (!selectedIssue) return;
    try {
      const res = await apiFetch(`/api/admin/issues/${selectedIssue.issue_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, progress_note: progressNote })
      });
      if (res.ok) {
        const data = await res.json();
        // Update selected issue preview dynamically
        setSelectedIssue(prev => prev ? { ...prev, status: nextStatus === 'resolved' ? 'resolved' : nextStatus } : null);
        setProgressNote('');
      } else {
        // Fallback directly to Firestore if endpoint fails
        const issueRef = doc(db, 'issues', selectedIssue.issue_id);
        const updateObj: any = { status: nextStatus, updated_at: new Date().toISOString() };
        if (nextStatus === 'resolved') {
          updateObj.resolved_at = new Date().toISOString();
        }
        await updateDoc(issueRef, updateObj);
        setSelectedIssue(prev => prev ? { ...prev, ...updateObj } : null);
        setProgressNote('');
      }
    } catch (err) {
      console.error("Failed to transition status:", err);
    }
  };

  // Assign staff responder
  const handleAssignStaff = async (staffId: string) => {
    if (!selectedIssue || !staffId) return;
    try {
      const res = await apiFetch(`/api/admin/issues/${selectedIssue.issue_id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_person_id: staffId })
      });
      if (res.ok) {
        setSelectedIssue(prev => prev ? { ...prev, assigned_to_person: staffId, status: 'resolving' } : null);
        setAssignedStaffId('');
        
        // Also increment staff member workload in Firestore
        const staffRef = doc(db, 'staff', staffId);
        await updateDoc(staffRef, { active_assignments: (staff.find(s => s.id === staffId)?.active_assignments || 0) + 1 });
      } else {
        // Direct fallback
        const issueRef = doc(db, 'issues', selectedIssue.issue_id);
        await updateDoc(issueRef, { assigned_to_person: staffId, status: 'resolving' });
        setSelectedIssue(prev => prev ? { ...prev, assigned_to_person: staffId, status: 'resolving' } : null);
        setAssignedStaffId('');
      }
    } catch (err) {
      console.error("Failed to assign staff:", err);
    }
  };

  // Submit internal log notes
  const handleSubmitProgressNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !progressNote.trim()) return;
    try {
      const res = await apiFetch(`/api/admin/issues/${selectedIssue.issue_id}/progress-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: progressNote })
      });
      if (res.ok) {
        setProgressNote('');
      } else {
        const noteId = 'note_' + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'admin_notes', noteId), {
          note_id: noteId,
          issue_id: selectedIssue.issue_id,
          author_id: 'authority_officer',
          text: progressNote,
          created_at: new Date().toISOString()
        });
        setProgressNote('');
      }
    } catch (err) {
      console.error("Failed to submit progress note:", err);
    }
  };

  // Photo uploading simulation
  const handleUploadResolutionPhoto = async (photoUrl: string) => {
    if (!selectedIssue) return;
    setUploadingPhoto(true);
    try {
      const res = await apiFetch(`/api/admin/issues/${selectedIssue.issue_id}/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIssue(prev => prev ? { ...prev, before_after_photos: data.before_after_photos } : null);
      } else {
        const issueRef = doc(db, 'issues', selectedIssue.issue_id);
        const currentPhotos = selectedIssue.before_after_photos || [];
        const updatedPhotos = [...currentPhotos, photoUrl];
        await updateDoc(issueRef, { before_after_photos: updatedPhotos });
        setSelectedIssue(prev => prev ? { ...prev, before_after_photos: updatedPhotos } : null);
      }
    } catch (err) {
      console.error("Photo upload simulation failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Add municipal staff
  const handleAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;
    setStaffSubmitting(true);
    try {
      const staffId = 'staff_' + Math.random().toString(36).substr(2, 9);
      const memberObj = {
        name: newStaffName,
        email: newStaffEmail,
        role: newStaffRole,
        department: newStaffDept,
        status: 'On Duty' as const,
        active_assignments: 0,
        resolved_count: 0,
        performance_score: 5.0
      };

      await setDoc(doc(db, 'staff', staffId), memberObj);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffRole('Responder');
    } catch (err) {
      console.error("Failed to add staff member:", err);
    } finally {
      setStaffSubmitting(false);
    }
  };

  // Remove staff
  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to decommission this staff member?")) return;
    try {
      await deleteDoc(doc(db, 'staff', staffId));
    } catch (err) {
      console.error("Decommissioning failed:", err);
    }
  };

  // Helper styles
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2.5 py-1 text-[10px] font-black text-red-700 bg-red-50 border border-red-100 rounded-lg uppercase tracking-wider">Critical</span>;
      case 'high':
        return <span className="px-2.5 py-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-lg uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg uppercase tracking-wider">Medium</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg uppercase tracking-wider">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="px-3 py-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">Resolved</span>;
      case 'resolving':
        return <span className="px-3 py-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase tracking-wider">Resolving</span>;
      case 'investigating':
        return <span className="px-3 py-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 rounded-full uppercase tracking-wider">Investigating</span>;
      case 'Assigned':
      case 'assigned':
        return <span className="px-3 py-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">Assigned</span>;
      default:
        return <span className="px-3 py-1 text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 rounded-full uppercase tracking-wider">Reported</span>;
    }
  };

  return (
    <div className="space-y-8" id="admin-center-layout">
      
      {/* 1. Header with metadata details */}
      <section className="flex flex-col md:flex-row justify-between md:items-center gap-6" id="admin-header">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Verified Municipal Command Center
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Municipal Command Center</h1>
          <p className="text-xs text-slate-500 font-medium">
            SLA Dispatch, Team Rosters, and real-time response infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="w-10 h-10 rounded-full bg-emerald-600 font-black text-sm flex items-center justify-center">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-200">{user.name}</p>
            <p className="font-mono text-[10px] text-slate-400 mt-0.5">{myDepartment}</p>
          </div>
        </div>
      </section>

      {/* 2. Unified KPIs section updated real-time */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="admin-realtime-metrics">
        {[
          { label: 'Assigned Incidents', value: totalAssigned, icon: AlertTriangle, style: 'text-amber-100 bg-emerald-700/50 border-emerald-500/50' },
          { label: 'In Repair Pipeline', value: inProgressCount, icon: Hammer, style: 'text-blue-100 bg-emerald-700/50 border-emerald-500/50' },
          { label: 'Resolved This Month', value: resolvedThisMonth, icon: CheckCircle, style: 'text-emerald-100 bg-emerald-700/50 border-emerald-500/50' },
          { label: 'Avg Resolution Time', value: `${avgResolutionDays} Days`, icon: Clock, style: 'text-emerald-100 bg-emerald-700/50 border-emerald-500/50' },
          { label: 'Evaluation Rating', value: `${rating} / 5`, icon: Sparkles, style: 'text-red-100 bg-emerald-700/50 border-emerald-500/50' }
        ].map((kpi, idx) => (
          <div key={idx} className="p-5 bg-emerald-600 border border-emerald-500 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow text-white">
            <div className={`p-2.5 rounded-xl border ${kpi.style} shrink-0`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-lg font-black text-white mt-1">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Panel Switcher Tabs */}
      <div className="flex border-b border-slate-200" id="admin-tabs">
        <button
          onClick={() => { setActiveTab('queue'); setCurrentPage(1); }}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'queue' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Incidents Queue ({sortedIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'staff' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Registry ({staff.length})
        </button>
      </div>

      {/* 4. Active Tab content render */}
      <AnimatePresence mode="wait">
        {activeTab === 'queue' && (
          <motion.div
            key="queue-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Control Bar for Filtration & Searching */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between" id="queue-controls">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID or title..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Status selector */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="reported">Reported</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Sorting options */}
                <button
                  onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Order: <span className="text-emerald-600 uppercase">{sortOrder}</span>
                </button>
              </div>
            </div>

            {/* Main Incidents Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="incidents-table-container">
              {paginatedIssues.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">No matching records found</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">No logged issues matches the selected search filters or status parameters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-4 px-6">Issue Details</th>
                        <th className="py-4 px-4">Severity / Department</th>
                        <th className="py-4 px-4">Confidence / Trust</th>
                        <th className="py-4 px-4">Assigned To</th>
                        <th className="py-4 px-4">Current Status</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedIssues.map((issue) => {
                        const assignedPerson = staff.find(s => s.id === issue.assigned_to_person);
                        return (
                          <tr 
                            key={issue.issue_id} 
                            onClick={() => setSelectedIssue(issue)}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                          >
                            <td className="py-4 px-6 max-w-xs">
                              <div className="flex items-center gap-3">
                                {issue.image_urls?.[0] && (
                                  <img 
                                    src={issue.image_urls[0]} 
                                    alt={issue.title} 
                                    referrerPolicy="no-referrer"
                                    className="w-12 h-12 object-cover rounded-xl border border-slate-100 shrink-0 shadow-sm" 
                                  />
                                )}
                                <div className="space-y-1">
                                  <h4 className="font-bold text-slate-900 line-clamp-1">{issue.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono">ID: {issue.issue_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="space-y-1.5">
                                {getSeverityBadge(issue.severity)}
                                <p className="text-[10px] text-slate-500 font-bold">{issue.category}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                {issue.verification_percentage}% ({issue.confidence}% Confidence)
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-semibold">
                              {assignedPerson ? (
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                  {assignedPerson.name}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-normal">Unassigned</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {getStatusBadge(issue.status)}
                            </td>
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedIssue(issue)}
                                className="h-8 w-8 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all border border-slate-200 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">
                    Page {currentPage} of {totalPages} (Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedIssues.length)} of {sortedIssues.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div
            key="staff-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left 2 Cols: Staff members list */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="staff-table-container">
                <div className="p-6 border-b border-slate-50">
                  <h3 className="text-base font-bold text-slate-900">Active Municipal Staff Directory</h3>
                  <p className="text-xs text-slate-400 mt-1">Track deployment state, total assignments, and historical resolution counts.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-4 px-6">Name / Roster Details</th>
                        <th className="py-4 px-4">Assigned Department</th>
                        <th className="py-4 px-4">Active Loads</th>
                        <th className="py-4 px-4">Total Resolved</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-6 text-right">Decommission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staff.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold shrink-0">
                                {member.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{member.name}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-600 font-semibold">{member.department}</td>
                          <td className="py-4 px-4 font-bold text-emerald-600 text-sm">{member.active_assignments} active</td>
                          <td className="py-4 px-4 font-bold text-slate-700">{member.resolved_count} issues</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                              member.status === 'On Duty' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleRemoveStaff(member.id)}
                              className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition-all cursor-pointer border border-transparent hover:border-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Add Staff Form */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5" id="staff-creation-card">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Staff Member</h3>
                  <p className="text-xs text-slate-400 mt-1">Deploy new responders to departments and assign incoming civic incidents.</p>
                </div>

                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Officer Sarah Jenkins"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sarah.j@city.gov"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Role</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pothole Dispatcher"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Link</label>
                    <select
                      value={newStaffDept}
                      onChange={(e) => setNewStaffDept(e.target.value)}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="Department of Transportation">Department of Transportation</option>
                      <option value="Water Board">Water Board</option>
                      <option value="Public Sanitation">Public Sanitation</option>
                      <option value="Power & Electricity">Power & Electricity</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={staffSubmitting}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-100 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Deploy Responder
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Comprehensive Action Overlay Dialog */}
      <AnimatePresence>
        {selectedIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="dispatch-dialog">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-4xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Overlay Dialog Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">
                      ID: {selectedIssue.issue_id}
                    </span>
                    {getSeverityBadge(selectedIssue.severity)}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 line-clamp-1">{selectedIssue.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="h-9 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Close Panel
                </button>
              </div>

              {/* Scrollable Layout Content */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Side: General Info & Before/After Gallery */}
                <div className="md:col-span-7 space-y-6">
                  
                  {/* Detailed summary */}
                  <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Report Description</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedIssue.description || 'No descriptive text was attached by the reporter.'}</p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Department In-Charge</p>
                        <p className="font-bold text-slate-800 mt-1">{selectedIssue.department}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Location Geocode</p>
                        <p className="font-mono text-slate-800 mt-1">{selectedIssue.location.lat.toFixed(5)}, {selectedIssue.location.lng.toFixed(5)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Before & After Photo Gallery Comparison */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-slate-500" />
                      Before & After Repair Documentation
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Before Photo */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Before (Incident Reported)</span>
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner relative flex items-center justify-center">
                          {selectedIssue.image_urls?.[0] ? (
                            <img src={selectedIssue.image_urls[0]} alt="Before repair" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-400 italic">No image submitted</span>
                          )}
                        </div>
                      </div>

                      {/* After Photo */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">After (Municipal Resolution)</span>
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner relative flex items-center justify-center">
                          {selectedIssue.before_after_photos?.[0] ? (
                            <img src={selectedIssue.before_after_photos[0]} alt="After repair" referrerPolicy="no-referrer" className="w-full h-full object-cover animate-fade-in" />
                          ) : (
                            <div className="p-4 text-center space-y-1.5 text-slate-400">
                              <span className="text-xs italic block">Pending Resolution Photo</span>
                              {selectedIssue.status !== 'resolved' && (
                                <div className="flex flex-col gap-1.5 pt-1.5">
                                  {resolvedSamplePhotos.map((p, i) => (
                                    <button
                                      key={i}
                                      onClick={() => handleUploadResolutionPhoto(p.url)}
                                      disabled={uploadingPhoto}
                                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                      Simulate: {p.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic internal log notes list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                      Internal Progress Log
                    </h4>

                    {loadingNotes ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-slate-100 rounded"></div>
                        <div className="h-4 bg-slate-100 rounded"></div>
                      </div>
                    ) : adminNotes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No internal municipal progress logs added yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {adminNotes.map((note) => (
                          <div key={note.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
                            <p className="text-slate-700 leading-relaxed font-medium">{note.text}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{new Date(note.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: State Machine Dispatch Actions */}
                <div className="md:col-span-5 space-y-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/60 flex flex-col">
                  
                  {/* Status Indicator */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Status</label>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(selectedIssue.status)}
                    </div>
                  </div>

                  {/* Assign dropdown */}
                  {selectedIssue.status !== 'resolved' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assign Roster Staff</label>
                      <div className="flex gap-2">
                        <select
                          value={assignedStaffId}
                          onChange={(e) => setAssignedStaffId(e.target.value)}
                          className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        >
                          <option value="">Select Responder...</option>
                          {staff
                            .filter(s => s.department === selectedIssue.department)
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.active_assignments} active)</option>
                            ))
                          }
                        </select>
                        <button
                          disabled={!assignedStaffId}
                          onClick={() => handleAssignStaff(assignedStaffId)}
                          className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pipeline Transitions */}
                  {selectedIssue.status !== 'resolved' && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/80">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Advance Dispatch Pipeline</label>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedIssue.status === 'reported' && (
                          <button
                            onClick={() => handleStatusChange('investigating')}
                            className="w-full h-10 bg-transparent hover:bg-teal-50 border-2 border-teal-500 text-teal-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" /> Start Inspection
                          </button>
                        )}
                        {(selectedIssue.status === 'reported' || selectedIssue.status === 'investigating' || selectedIssue.status === 'Assigned' || selectedIssue.status === 'assigned') && (
                          <button
                            onClick={() => handleStatusChange('resolving')}
                            className="w-full h-10 bg-transparent hover:bg-teal-50 border-2 border-teal-500 text-teal-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Hammer className="w-3.5 h-3.5" /> Dispatched to Repair
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange('resolved')}
                          className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Close Incident & Resolve
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit notes form */}
                  {selectedIssue.status !== 'resolved' && (
                    <form onSubmit={handleSubmitProgressNote} className="space-y-2.5 pt-4 border-t border-slate-200/80 mt-auto">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Write Operational Note</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. Dispatched asphalt truck. Crew expects completion by Thursday afternoon."
                        value={progressNote}
                        onChange={(e) => setProgressNote(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all"
                      ></textarea>
                      <button
                        type="submit"
                        disabled={!progressNote.trim()}
                        className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        Publish Internal Update
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
