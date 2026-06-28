import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { 
  User, 
  Mail, 
  Award, 
  MapPin, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  CheckCircle, 
  Activity,
  Edit2,
  Lock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [verCount, setVerCount] = useState(0);

  // Edit profile form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editZone, setEditZone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchExtraData = async () => {
      try {
        // Try getting cached version first for instant display
        const cached = localStorage.getItem(`user_profile_${user.user_id}`);
        if (cached) {
          setProfile(JSON.parse(cached));
        } else {
          setProfile(user);
        }

        // Fetch from Firestore in the background
        const docRef = doc(db, 'users', user.user_id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const fetchedProfile = snap.data() as UserProfile;
          setProfile(fetchedProfile);
          localStorage.setItem(`user_profile_${user.user_id}`, JSON.stringify(fetchedProfile));
        }

        // Fetch user's verification records
        const q = query(collection(db, 'verifications'), where('user_id', '==', user.user_id));
        const snapVer = await getDocs(q);
        setVerCount(snapVer.size);
      } catch (err) {
        console.error("Error loading profile extra data:", err);
        const cached = localStorage.getItem(`user_profile_${user.user_id}`);
        if (cached) {
          setProfile(JSON.parse(cached));
        } else {
          setProfile(user);
        }
        setVerCount(0); // fallback for elegant visuals
      } finally {
        setLoading(false);
      }
    };

    fetchExtraData();
  }, [user]);

  useEffect(() => {
    const activeProfile = profile || user;
    if (activeProfile) {
      setEditName(activeProfile.name || '');
      setEditPhone(activeProfile.phone || '');
      setEditZone(activeProfile.zone || 'Zone 4-A');
    }
  }, [profile, user]);

  const openEditModal = () => {
    const activeProfile = profile || user;
    if (activeProfile) {
      setEditName(activeProfile.name || '');
      setEditPhone(activeProfile.phone || '');
      setEditZone(activeProfile.zone || 'Zone 4-A');
    }
    setSaveError(null);
    setIsEditModalOpen(true);
  };

  const openEditInline = () => {
    const activeProfile = profile || user;
    if (activeProfile) {
      setEditName(activeProfile.name || '');
      setEditPhone(activeProfile.phone || '');
      setEditZone(activeProfile.zone || 'Zone 4-A');
    }
    setSaveError(null);
    setIsEditingInline(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setSaveError('Name is required');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateProfile({
        name: editName,
        phone: editPhone,
        zone: editZone
      });
      
      // Update the local profile state immediately to prevent stale visual render
      setProfile(prev => prev ? {
        ...prev,
        name: editName,
        phone: editPhone,
        zone: editZone
      } : {
        ...user!,
        name: editName,
        phone: editPhone,
        zone: editZone
      });

      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const badgesList = [
    { name: 'First Responder', desc: 'Reported your first hyperlocal issue', icon: Activity, color: 'bg-navy/10 text-navy border-navy/20' },
    { name: 'Community Sentinel', desc: 'Verified 5 civic reports correctly', icon: ShieldCheck, color: 'bg-saffron/10 text-saffron border-saffron/20' },
    { name: 'Eagle Eye', desc: 'Maintained credibility index above 95%', icon: CheckCircle, color: 'bg-[#138808]/10 text-[#138808] border-[#138808]/20' }
  ];

  if (!user || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-slate-50" id="profile-loader">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-200"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const activeProfile = profile || user;

  return (
    <div className="space-y-8" id="profile-view">
      
      {/* Banner / Header Card */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8" id="profile-banner">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_30%,#4f46e5_0%,transparent_50%)] pointer-events-none"></div>
        
        {/* Large Initials Avatar */}
        <div className="w-24 h-24 rounded-full bg-navy text-white font-black text-3xl flex items-center justify-center border-4 border-slate-800 shadow-lg relative shrink-0">
          {activeProfile.name.charAt(0).toUpperCase()}
          {activeProfile.is_authority && (
            <span className="absolute bottom-0 right-0 p-1.5 bg-[#138808] rounded-full border-2 border-slate-900" title="Verified Public Authority">
              <ShieldCheck className="w-4 h-4 text-white" />
            </span>
          )}
        </div>

        <div className="space-y-4 flex-1 text-center md:text-left z-10 w-full">
          {isEditingInline ? (
            <div className="space-y-3 max-w-md mx-auto md:mx-0">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-800 text-slate-100 border border-slate-700 focus:border-amber-500 rounded-xl text-sm font-semibold focus:outline-none"
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-800 text-slate-100 border border-slate-700 focus:border-amber-500 rounded-xl text-sm font-semibold focus:outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Zone</label>
                <select
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-800 text-slate-100 border border-slate-700 focus:border-amber-500 rounded-xl text-sm font-semibold focus:outline-none appearance-none"
                >
                  <option value="Zone 1-A">Zone 1-A (Downtown Core)</option>
                  <option value="Zone 2-B">Zone 2-B (Northside Waterfront)</option>
                  <option value="Zone 3-C">Zone 3-C (Eastside Residential)</option>
                  <option value="Zone 4-A">Zone 4-A (South Industrial)</option>
                  <option value="Zone 5-E">Zone 5-E (West Hills)</option>
                </select>
              </div>
              {saveError && (
                <p className="text-red-400 text-xs text-left font-semibold">{saveError}</p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight">{activeProfile.name}</h1>
                <p className="text-slate-400 text-sm flex items-center justify-center md:justify-start gap-1.5 font-medium">
                  <Mail className="w-4 h-4 text-slate-500" />
                  {activeProfile.email}
                </p>
                {activeProfile.phone && (
                  <p className="text-slate-400 text-xs flex items-center justify-center md:justify-start gap-1.5 mt-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {activeProfile.phone}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-mono pt-1">
                <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Credibility Score: <span className="text-saffron font-bold">{activeProfile.credibility_score}</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-navy border border-navy/50 text-white flex items-center gap-1.5 shadow-sm shadow-navy/20">
                  <Award className="w-3.5 h-3.5 text-saffron" />
                  Community Hero Points: <span className="text-saffron font-bold">{activeProfile.community_hero_points || 0}</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Registered Zone: <span className="text-saffron font-bold">{activeProfile.zone || 'Zone 4-A'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {isEditingInline ? (
          <div className="flex gap-2 self-center md:self-start z-10 shrink-0">
            <button
              onClick={() => setIsEditingInline(false)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!editName.trim()) {
                  setSaveError('Name is required');
                  return;
                }
                setIsSaving(true);
                setSaveError(null);
                try {
                  await updateProfile({
                    name: editName,
                    phone: editPhone,
                    zone: editZone
                  });
                  setProfile(prev => prev ? {
                    ...prev,
                    name: editName,
                    phone: editPhone,
                    zone: editZone
                  } : {
                    ...user!,
                    name: editName,
                    phone: editPhone,
                    zone: editZone
                  });
                  setIsEditingInline(false);
                } catch (err: any) {
                  setSaveError(err.message || 'Failed to save profile');
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button 
            id="btn-edit-profile-modal"
            onClick={openEditInline}
            className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl flex items-center gap-1.5 self-center md:self-start transition-colors cursor-pointer z-10"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Stats Cards */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 vibe-3d space-y-4">
            <h3 className="text-base font-bold text-slate-900">Your Civic Activity</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 text-sm">
                <span className="text-slate-500">Reports Filed</span>
                <span className="font-bold text-slate-900">{activeProfile.total_issues_reported}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 text-sm">
                <span className="text-slate-500">Verifications Sent</span>
                <span className="font-bold text-slate-900">{verCount}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 text-sm">
                <span className="text-[#138808] font-semibold">Hero Points Earned</span>
                <span className="font-bold text-[#138808]">{activeProfile.community_hero_points || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 text-sm">
                <span className="text-slate-500">Account Created</span>
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(activeProfile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Badge Collection */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 vibe-3d space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-[#138808]" />
              Unlocked Badges
            </h3>
            <p className="text-xs text-slate-500">Gain score and confirm real issues in your neighborhood to unlock higher medals of civic excellence.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {badgesList.map((badge) => {
                const isEarned = activeProfile.badges_earned?.includes(badge.name);
                const IconComp = badge.icon;
                return (
                  <div 
                    key={badge.name} 
                    className={`p-5 rounded-2xl border text-center space-y-3 flex flex-col items-center justify-center vibe-3d transition-all ${
                      isEarned 
                        ? badge.color 
                        : 'bg-slate-50 text-slate-400 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div className="p-3 bg-white rounded-full border border-inherit shadow-sm relative">
                      <IconComp className="w-5 h-5" />
                      {!isEarned && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-slate-200 text-slate-500 rounded-full border border-white">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className={`font-bold text-xs ${isEarned ? '' : 'text-slate-500'}`}>{badge.name}</h4>
                      <p className="text-[10px] opacity-80 mt-1 leading-relaxed">{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
            id="edit-profile-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              id="edit-profile-dialog"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Edit Profile</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update your public identity on CityMind</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProfile} className="p-6 space-y-4 overflow-y-auto">
                {saveError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
                    {saveError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="edit-name-input" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <input
                      id="edit-name-input"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-150 dark:border-slate-800 focus:border-slate-300 dark:focus:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-amber-500 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-phone-input" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <input
                      id="edit-phone-input"
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-150 dark:border-slate-800 focus:border-slate-300 dark:focus:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-amber-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-zone-select" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Registered Zone
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <select
                      id="edit-zone-select"
                      value={editZone}
                      onChange={(e) => setEditZone(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-150 dark:border-slate-800 focus:border-slate-300 dark:focus:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-amber-500 transition-all font-semibold appearance-none"
                    >
                      <option value="Zone 1-A">Zone 1-A (Downtown Core)</option>
                      <option value="Zone 2-B">Zone 2-B (Northside Waterfront)</option>
                      <option value="Zone 3-C">Zone 3-C (Eastside Residential)</option>
                      <option value="Zone 4-A">Zone 4-A (South Industrial)</option>
                      <option value="Zone 5-E">Zone 5-E (West Hills)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-150 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 h-10 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
