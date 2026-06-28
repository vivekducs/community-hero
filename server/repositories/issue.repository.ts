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

export interface Issue {
  issue_id: string;
  title: string;
  description: string;
  image_urls: string[];
  location: {
    lat: number;
    lng: number;
  };
  category: string;
  subcategory: string;
  severity: string;
  confidence: number;
  status: string;
  department: string;
  created_by: string;
  created_by_name: string;
  upvotes: number;
  downvotes: number;
  verification_percentage: number;
  escalation_level: number;
  escalation_flag?: boolean;
  is_duplicate_of?: string;
  image_feedback?: string;
  image_flagged_status?: string;
  created_at: string;
  updated_at?: string;
  assigned_to?: string;
  assigned_to_person?: string;
  assigned_at?: string;
  resolved_at?: string;
  before_after_photos?: string[];
  comments_count?: number;
  agent_actions?: any[];
}

export interface Comment {
  comment_id: string;
  issue_id: string;
  author_id: string;
  author_name: string;
  text: string;
  upvotes: number;
  created_at: string;
}

export class IssueRepository {
  private static cacheIssues: Issue[] | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_TTL_MS = 15000; // 15 seconds cache

  private static invalidateCache() {
    this.cacheIssues = null;
    this.cacheExpiry = 0;
  }

  static async getById(issueId: string): Promise<Issue | null> {
    // Check if item is in cached list first
    if (this.cacheIssues && Date.now() < this.cacheExpiry) {
      const cachedItem = this.cacheIssues.find(i => i.issue_id === issueId);
      if (cachedItem) return cachedItem;
    }

    const docRef = doc(db, 'issues', issueId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Issue;
  }

  static async create(issue: Issue): Promise<void> {
    await setDoc(doc(db, 'issues', issue.issue_id), issue);
    this.invalidateCache();
  }

  static async update(issueId: string, fields: Partial<Issue>): Promise<void> {
    const docRef = doc(db, 'issues', issueId);
    await updateDoc(docRef, fields);
    this.invalidateCache();
  }

  static async getAll(): Promise<Issue[]> {
    const now = Date.now();
    if (this.cacheIssues && now < this.cacheExpiry) {
      return [...this.cacheIssues];
    }

    const colRef = collection(db, 'issues');
    const q = query(colRef);
    const snap = await getDocs(q);
    const issues: Issue[] = [];
    snap.forEach((d) => {
      issues.push(d.data() as Issue);
    });

    this.cacheIssues = issues;
    this.cacheExpiry = now + this.CACHE_TTL_MS;
    return [...issues];
  }

  static async getAutoDiscardedByReporterOrNearLocation(
    reporterId: string,
    category: string
  ): Promise<Issue[]> {
    const q = query(
      collection(db, 'issues'),
      where('created_by', '==', reporterId),
      where('status', '==', 'auto_discarded')
    );
    const snap = await getDocs(q);
    const list: Issue[] = [];
    snap.forEach((d) => {
      const data = d.data() as Issue;
      if (data.category === category) {
        list.push(data);
      }
    });
    return list;
  }

  // Comments subcollection
  static async addComment(issueId: string, comment: Comment): Promise<void> {
    await setDoc(doc(db, 'issues', issueId, 'comments', comment.comment_id), comment);
    // Increment comment count
    const issueRef = doc(db, 'issues', issueId);
    await updateDoc(issueRef, {
      comments_count: increment(1)
    });
    this.invalidateCache();
  }

  static async getComments(issueId: string): Promise<Comment[]> {
    const colRef = collection(db, 'issues', issueId, 'comments');
    const q = query(colRef);
    const snap = await getDocs(q);
    const comments: Comment[] = [];
    snap.forEach((d) => {
      comments.push(d.data() as Comment);
    });
    // Sort newest first
    comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return comments;
  }

  static async upvoteComment(issueId: string, commentId: string): Promise<number> {
    const docRef = doc(db, 'issues', issueId, 'comments', commentId);
    await updateDoc(docRef, {
      upvotes: increment(1)
    });
    const snap = await getDoc(docRef);
    this.invalidateCache();
    return snap.data()?.upvotes || 0;
  }
}
