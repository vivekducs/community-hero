import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { UserProfile } from '../types';
import { useAuthStore } from '../store';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, name: string) => Promise<UserProfile>;
  login: (email: string, password: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  loginAsGuest: (name?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [loading, setLoadingState] = useState<boolean>(true);
  const [error, setErrorState] = useState<string | null>(null);

  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let isSubscribed = true;

    // 1. Set up onAuthStateChanged listener as the single source of truth for auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!isSubscribed) return;
      
      console.log("🔑 [Auth Debug] onAuthStateChanged triggered. User UID:", firebaseUser?.uid || "null");
      
      setLoadingState(true);
      setLoading(true);

      if (firebaseUser) {
        try {
          console.log("🔍 [Auth Debug] Processing user profile for UID:", firebaseUser.uid);
          const cached = localStorage.getItem(`user_profile_${firebaseUser.uid}`);
          let profile: UserProfile | null = null;
          if (cached) {
            try {
              profile = JSON.parse(cached);
              console.log("📦 [Auth Debug] Loaded profile from cache:", profile);
            } catch (e) {
              console.error("❌ [Auth Debug] Error parsing cached profile:", e);
            }
          }

          if (!profile) {
            console.log("📡 [Auth Debug] Fetching user profile from Firestore for UID:", firebaseUser.uid);
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              profile = userDocSnap.data() as UserProfile;
              console.log("📥 [Auth Debug] Profile retrieved from Firestore:", profile);
            } else {
              console.log("📝 [Auth Debug] Creating new user profile in Firestore for UID:", firebaseUser.uid);
              profile = {
                user_id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                credibility_score: 100,
                total_issues_reported: 0,
                badges_earned: [],
                is_authority: firebaseUser.email === 'vip901it@gmail.com' || firebaseUser.email?.endsWith('.gov') || false,
                created_at: new Date().toISOString()
              };
              await setDoc(userDocRef, profile);
            }
          }

          if (profile && isSubscribed) {
            localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(profile));
            setUserState(profile);
            setUser(profile);
            console.log("✅ [Auth Debug] Authentication successfully initialized for profile:", profile.name);
          }
        } catch (err: any) {
          console.error("❌ [Auth Debug] Error in onAuthStateChanged profile setup:", err);
          const cached = localStorage.getItem(`user_profile_${firebaseUser.uid}`);
          let profile: UserProfile;
          if (cached) {
            profile = JSON.parse(cached);
          } else {
            profile = {
              user_id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              credibility_score: 100,
              total_issues_reported: 0,
              badges_earned: [],
              is_authority: firebaseUser.email === 'vip901it@gmail.com' || false,
              created_at: new Date().toISOString()
            };
          }
          if (isSubscribed) {
            setUserState(profile);
            setUser(profile);
          }
        }
      } else {
        // No Firebase user. Check if there is an active custom/sandbox session
        const customSession = localStorage.getItem('custom_auth_session');
        if (customSession) {
          try {
            const profile = JSON.parse(customSession);
            console.log("🛠️ [Auth Debug] Found active custom/sandbox session:", profile);
            if (isSubscribed) {
              setUserState(profile);
              setUser(profile);
            }
          } catch (e) {
            console.error("❌ [Auth Debug] Error parsing custom sandbox session:", e);
            if (isSubscribed) {
              setUserState(null);
              setUser(null);
            }
          }
        } else {
          console.log("👤 [Auth Debug] No active session found.");
          if (isSubscribed) {
            setUserState(null);
            setUser(null);
          }
        }
      }

      if (isSubscribed) {
        setLoadingState(false);
        setLoading(false);
      }
    });

    // 2. Handle redirect result asynchronously on mount to ensure any pending sign-in redirects resolve
    console.log("📡 [Auth Debug] Checking redirect result...");
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          console.log("🎯 [Auth Debug] getRedirectResult successfully resolved. User UID:", result.user.uid);
        } else {
          console.log("🎯 [Auth Debug] getRedirectResult completed (no redirect user to process).");
        }
      })
      .catch((err: any) => {
        console.error("❌ [Auth Debug] Redirect sign-in result error:", err);
        if (isSubscribed) {
          setErrorState(err.code || err.message || "Failed to process redirect login.");
        }
      });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [setUser, setLoading]);

  const signup = async (email: string, password: string, name: string): Promise<UserProfile> => {
    setLoadingState(true);
    setLoading(true);
    setErrorState(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const profile: UserProfile = {
        user_id: firebaseUser.uid,
        email: email,
        name: name,
        credibility_score: 100,
        total_issues_reported: 0,
        badges_earned: [],
        is_authority: email === 'vip901it@gmail.com' || email.endsWith('.gov') || false,
        created_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), profile);
      localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(profile));
      setUserState(profile);
      setUser(profile);
      setLoadingState(false);
      setLoading(false);
      return profile;
    } catch (err: any) {
      setErrorState(err.message || 'Failed to sign up');
      setLoadingState(false);
      setLoading(false);
      throw err;
    }
  };

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoadingState(true);
    setLoading(true);
    setErrorState(null);

    // Seeded Authority bypass
    const normalizedEmail = email.trim().toLowerCase();
    if (
      (normalizedEmail === 'admin@citymind.gov' && password === 'googledev') ||
      (normalizedEmail === 'vip901it@gmail.com' && password === 'vibe2ship')
    ) {
      const isSuperUser = normalizedEmail === 'vip901it@gmail.com';
      const userId = isSuperUser ? 'superuser_vip901it_admin' : 'authority_seeded_admin_2026';
      const profile: UserProfile = {
        user_id: userId,
        email: normalizedEmail,
        name: isSuperUser ? 'VIP System Administrator' : 'Lead Authority Officer',
        credibility_score: isSuperUser ? 500 : 150,
        total_issues_reported: isSuperUser ? 42 : 12,
        badges_earned: isSuperUser 
          ? ['Grand Sentinel', 'City Governor', 'System Administrator'] 
          : ['City Architect', 'Lead Officer'],
        is_authority: true,
        is_superuser: isSuperUser,
        department_id: isSuperUser ? 'All Municipal Departments' : 'Department of Transportation',
        department: isSuperUser ? 'All Municipal Departments' : 'Department of Transportation',
        created_at: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'users', userId), profile, { merge: true });
      } catch (err) {
        console.warn("Failed to sync admin profile to Firestore (using local state fallback):", err);
      }

      localStorage.setItem('custom_auth_session', JSON.stringify(profile));
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(profile));
      setUserState(profile);
      setUser(profile);
      setLoadingState(false);
      setLoading(false);
      return profile;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let profile: UserProfile;
      if (userDocSnap.exists()) {
        profile = userDocSnap.data() as UserProfile;
      } else {
        profile = {
          user_id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          credibility_score: 100,
          total_issues_reported: 0,
          badges_earned: [],
          is_authority: firebaseUser.email === 'vip901it@gmail.com' || firebaseUser.email?.endsWith('.gov') || false,
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), profile);
      }

      localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(profile));
      setUserState(profile);
      setUser(profile);
      setLoadingState(false);
      setLoading(false);
      return profile;
    } catch (err: any) {
      setErrorState(err.message || 'Failed to log in');
      setLoadingState(false);
      setLoading(false);
      throw err;
    }
  };

  const loginWithGoogle = async (): Promise<UserProfile> => {
    setLoadingState(true);
    setLoading(true);
    setErrorState(null);
    console.log("📡 [Auth Debug] loginWithGoogle flow initiated.");
    try {
      const provider = new GoogleAuthProvider();
      let userCredential;
      try {
        console.log("📡 [Auth Debug] Opening Google Sign-In popup...");
        userCredential = await signInWithPopup(auth, provider);
        console.log("✅ [Auth Debug] Popup resolved successfully. User UID:", userCredential.user.uid);
      } catch (popupErr: any) {
        console.warn("⚠️ [Auth Debug] Popup sign-in failed or was blocked by browser. Error code:", popupErr.code, popupErr.message);
        // Only automatically fall back to redirect if the popup was actually blocked by the browser.
        // If the user closed the popup voluntarily, do NOT force redirect them, as that traps them in a loop.
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/operation-not-allowed' ||
          popupErr.message?.includes('blocked') ||
          popupErr.message?.includes('popup')
        ) {
          console.log("📡 [Auth Debug] Popup blocked. Falling back to signInWithRedirect...");
          console.log("📡 [Auth Debug] Redirect started...");
          await signInWithRedirect(auth, provider);
          console.log("📡 [Auth Debug] Redirect completed (browser will reload).");
          return new Promise(() => {});
        }
        throw popupErr;
      }
      const firebaseUser = userCredential.user;

      console.log("🔍 [Auth Debug] Checking user profile in Firestore for UID:", firebaseUser.uid);
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let profile: UserProfile;
      if (userDocSnap.exists()) {
        profile = userDocSnap.data() as UserProfile;
        console.log("📥 [Auth Debug] Existing profile loaded from Firestore:", profile);
      } else {
        profile = {
          user_id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          credibility_score: 100,
          total_issues_reported: 0,
          badges_earned: [],
          is_authority: firebaseUser.email === 'vip901it@gmail.com' || firebaseUser.email?.endsWith('.gov') || false,
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), profile);
        console.log("📝 [Auth Debug] New user profile created in Firestore for UID:", firebaseUser.uid);
      }

      console.log("📦 [Auth Debug] Saving user profile to local cache.");
      localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(profile));
      console.log("📦 [Auth Debug] User context being updated.");
      setUserState(profile);
      setUser(profile);
      setLoadingState(false);
      setLoading(false);
      return profile;
    } catch (err: any) {
      console.error("❌ [Auth Debug] loginWithGoogle flow failed:", err);
      setErrorState(err.message || 'Failed to log in with Google');
      setLoadingState(false);
      setLoading(false);
      throw err;
    }
  };

  const loginAsGuest = async (name: string = 'Sentinel Citizen'): Promise<UserProfile> => {
    setLoadingState(true);
    setLoading(true);
    setErrorState(null);
    try {
      let guestId = localStorage.getItem('guest_user_id');
      if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('guest_user_id', guestId);
      }

      const profile: UserProfile = {
        user_id: guestId,
        email: `${guestId}@citymind.guest`,
        name: name,
        credibility_score: 100,
        total_issues_reported: 0,
        badges_earned: ['Early Sentinel'],
        is_authority: false,
        created_at: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', guestId), profile, { merge: true });
      } catch (err) {
        console.warn("Firestore sync failed for guest user:", err);
      }

      localStorage.setItem('custom_auth_session', JSON.stringify(profile));
      localStorage.setItem(`user_profile_${guestId}`, JSON.stringify(profile));

      setUserState(profile);
      setUser(profile);
      setLoadingState(false);
      setLoading(false);
      return profile;
    } catch (err: any) {
      setErrorState(err.message || 'Failed to login as Guest');
      setLoadingState(false);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoadingState(true);
    setLoading(true);
    try {
      localStorage.removeItem('custom_auth_session');
      if (user) {
        localStorage.removeItem(`user_profile_${user.user_id}`);
      }
      await signOut(auth);
      setUserState(null);
      setUser(null);
      setLoadingState(false);
      setLoading(false);
    } catch (err: any) {
      setErrorState(err.message || 'Failed to log out');
      setLoadingState(false);
      setLoading(false);
      throw err;
    }
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!user) return;
    const updatedProfile = { ...user, ...updated };
    
    // Always persist to local storage first, then update context state
    localStorage.setItem(`user_profile_${user.user_id}`, JSON.stringify(updatedProfile));
    setUserState(updatedProfile);
    setUser(updatedProfile);

    // Attempt to persist to cloud database in background, but don't crash if it fails
    try {
      await setDoc(doc(db, 'users', user.user_id), updatedProfile, { merge: true });
    } catch (err: any) {
      console.warn("Failed to sync profile to cloud database (will retry next save):", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signup, login, loginWithGoogle, loginAsGuest, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
