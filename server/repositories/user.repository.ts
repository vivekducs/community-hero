import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  credibility_score: number;
  community_hero_points?: number;
  total_issues_reported: number;
  badges_earned: string[];
  is_authority: boolean;
  zone?: string;
  total_points?: number;
  tier?: string;
  created_at: string;
}

export interface Verification {
  verification_id: string;
  issue_id: string;
  user_id: string;
  status: 'confirm' | 'reject';
  created_at: string;
}

export class UserRepository {
  static async getById(userId: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  }

  static async create(user: UserProfile): Promise<void> {
    await setDoc(doc(db, 'users', user.user_id), user);
  }

  static async update(userId: string, fields: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, fields);
  }

  static async getAll(): Promise<UserProfile[]> {
    const colRef = collection(db, 'users');
    const q = query(colRef);
    const snap = await getDocs(q);
    const users: UserProfile[] = [];
    snap.forEach((d) => {
      users.push(d.data() as UserProfile);
    });
    return users;
  }

  static async incrementReporterMetrics(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      total_issues_reported: increment(1),
      credibility_score: increment(15)
    });
  }

  static async awardVerificationPoints(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      community_hero_points: increment(10),
      credibility_score: increment(5)
    });
  }

  // Verifications handling
  static async getVerification(issueId: string, userId: string): Promise<Verification | null> {
    const verificationId = `v_${issueId}_${userId}`;
    const verRef = doc(db, 'verifications', verificationId);
    const snap = await getDoc(verRef);
    if (!snap.exists()) return null;
    return snap.data() as Verification;
  }

  static async saveVerification(verification: Verification): Promise<void> {
    const verRef = doc(db, 'verifications', verification.verification_id);
    await setDoc(verRef, verification);
  }

  static async getAllVerifications(): Promise<any[]> {
    const colRef = collection(db, 'verifications');
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list;
  }
}
