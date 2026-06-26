import { create } from 'zustand';
import { UserProfile, Issue } from './types';

interface AuthState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoading: true,
  setLoading: (isLoading) => set({ isLoading }),
}));

interface IssueState {
  issues: Issue[];
  setIssues: (issues: Issue[]) => void;
  addIssue: (issue: Issue) => void;
  updateIssue: (issue_id: string, updated: Partial<Issue>) => void;
}

export const useIssueStore = create<IssueState>((set) => ({
  issues: [],
  setIssues: (issues) => set({ issues }),
  addIssue: (issue) => set((state) => ({ issues: [issue, ...state.issues] })),
  updateIssue: (issue_id, updated) => set((state) => ({
    issues: state.issues.map((i) => i.issue_id === issue_id ? { ...i, ...updated } : i)
  })),
}));
