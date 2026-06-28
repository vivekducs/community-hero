import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Issue } from '../types';
import { ApiService } from '../services/api.service';

export function useIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Real-time listener for Firestore issues
    const unsub = onSnapshot(
      collection(db, 'issues'), 
      (snapshot) => {
        const list: Issue[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Issue);
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setIssues(list);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const createIssue = async (issueData: Partial<Issue> & { image_url?: string }): Promise<Issue> => {
    try {
      const newIssue = await ApiService.createIssue(issueData);
      return newIssue;
    } catch (err: any) {
      console.error("Failed to create issue via useIssues:", err);
      throw err;
    }
  };

  const verifyIssue = async (issueId: string, userId: string, vote: 'upvote' | 'downvote') => {
    try {
      const result = await ApiService.verifyIssue(issueId, userId, vote);
      return result;
    } catch (err: any) {
      console.error("Failed to verify issue via useIssues:", err);
      throw err;
    }
  };

  return { issues, loading, error, createIssue, verifyIssue };
}
