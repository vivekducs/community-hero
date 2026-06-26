import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [loading, setLoadingState] = useState<boolean>(true);
  const [error, setErrorState] = useState<string | null>(null);

  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoadingState(true);
      setLoading(true);
      setErrorState(null);

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profile = userDocSnap.data() as UserProfile;
            setUserState(profile);
            setUser(profile);
          } else {
            // Document might not exist if sign up hasn't written it yet or if created elsewhere
            const fallbackProfile: UserProfile = {
              user_id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              credibility_score: 100,
              total_issues_reported: 0,
              badges_earned: [],
              is_authority: firebaseUser.email === 'vip901it@gmail.com' || firebaseUser.email?.endsWith('.gov') || false,
              created_at: new Date().toISOString()
            };
            setUserState(fallbackProfile);
            setUser(fallbackProfile);
          }
        } catch (err: any) {
          console.error("Error fetching user profile:", err);
          // Standard fallback so we don't block the user
          const fallbackProfile: UserProfile = {
            user_id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            credibility_score: 100,
            total_issues_reported: 0,
            badges_earned: [],
            is_authority: firebaseUser.email === 'vip901it@gmail.com' || false,
            created_at: new Date().toISOString()
          };
          setUserState(fallbackProfile);
          setUser(fallbackProfile);
        }
      } else {
        setUserState(null);
        setUser(null);
      }

      setLoadingState(false);
      setLoading(false);
    });

    return () => unsubscribe();
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

  const logout = async () => {
    setLoadingState(true);
    setLoading(true);
    try {
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

  return (
    <AuthContext.Provider value={{ user, loading, error, signup, login, logout }}>
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
