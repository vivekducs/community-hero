import { apiFetch } from '../api';
import { Issue, Comment } from '../types';

export class ApiService {
  // Issues Endpoints
  static async getIssues(category?: string, status?: string): Promise<Issue[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    
    const response = await apiFetch(`/api/issues?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch issues');
    return response.json();
  }

  static async getIssueById(issueId: string): Promise<Issue> {
    const response = await apiFetch(`/api/issues/${issueId}`);
    if (!response.ok) throw new Error(`Failed to fetch issue ${issueId}`);
    return response.json();
  }

  static async createIssue(issueData: Partial<Issue> & { image_url?: string }): Promise<Issue> {
    const response = await apiFetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issueData),
    });
    if (!response.ok) throw new Error('Failed to submit issue report');
    return response.json();
  }

  static async verifyIssue(issueId: string, userId: string, vote: 'upvote' | 'downvote'): Promise<{ upvotes: number; downvotes: number; verification_percentage: number }> {
    const response = await apiFetch(`/api/issues/${issueId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, vote }),
    });
    if (!response.ok) throw new Error('Failed to submit verification');
    return response.json();
  }

  // Comments Endpoints
  static async getComments(issueId: string): Promise<Comment[]> {
    const response = await apiFetch(`/api/issues/${issueId}/comments`);
    if (!response.ok) throw new Error('Failed to load comments');
    return response.json();
  }

  static async addComment(issueId: string, userId: string, authorName: string, text: string): Promise<Comment> {
    const response = await apiFetch(`/api/issues/${issueId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, author_name: authorName, text }),
    });
    if (!response.ok) throw new Error('Failed to post comment');
    return response.json();
  }

  static async upvoteComment(issueId: string, commentId: string): Promise<number> {
    const response = await apiFetch(`/api/issues/${issueId}/comments/${commentId}/upvote`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to upvote comment');
    const data = await response.json();
    return data.upvotes;
  }

  // Admin / Supervisor Endpoints
  static async getAdminDashboardStats(department?: string): Promise<{ total_assigned: number; in_progress_count: number; resolved_count: number; avg_resolution_days: number; rating: number }> {
    const query = department ? `?department=${department}` : '';
    const response = await apiFetch(`/api/admin/dashboard${query}`);
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return response.json();
  }

  static async getAdminIssues(filters: { status?: string; priority?: string; department?: string }): Promise<Issue[]> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.department) params.append('department', filters.department);

    const response = await apiFetch(`/api/admin/issues?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch admin issues');
    return response.json();
  }

  static async assignIssue(issueId: string, assignedToPersonId: string): Promise<void> {
    const response = await apiFetch(`/api/admin/issues/${issueId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to_person_id: assignedToPersonId }),
    });
    if (!response.ok) throw new Error('Failed to assign issue');
  }

  static async updateIssueStatus(issueId: string, status: string, progressNote?: string): Promise<void> {
    const response = await apiFetch(`/api/admin/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, progress_note: progressNote }),
    });
    if (!response.ok) throw new Error('Failed to update status');
  }

  static async addProgressUpdate(issueId: string, note: string): Promise<any> {
    const response = await apiFetch(`/api/admin/issues/${issueId}/progress-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!response.ok) throw new Error('Failed to add progress note');
    return response.json();
  }

  static async uploadAfterPhoto(issueId: string, photoUrl: string): Promise<any> {
    const response = await apiFetch(`/api/admin/issues/${issueId}/upload-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    });
    if (!response.ok) throw new Error('Failed to upload photo');
    return response.json();
  }

  // Gamification & Leaderboard
  static async getLeaderboard(type: string, zone?: string): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('type', type);
    if (zone) params.append('zone', zone);

    const response = await apiFetch(`/api/gamification/leaderboard?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to load leaderboard');
    return response.json();
  }

  static async getUserPoints(userId: string): Promise<{ total_points: number; issues: number; verifications: number; resolutions: number }> {
    const response = await apiFetch(`/api/gamification/user-points/${userId}`);
    if (!response.ok) throw new Error('Failed to load user points breakdown');
    return response.json();
  }

  static async awardBadge(userId: string, badgeType: string): Promise<any> {
    const response = await apiFetch('/api/gamification/award-badge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, badge_type: badgeType }),
    });
    if (!response.ok) throw new Error('Failed to award badge');
    return response.json();
  }

  // Agent Triggers
  static async triggerInsights(): Promise<any[]> {
    const response = await apiFetch('/api/agent/insights', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to trigger predictive insights');
    const data = await response.json();
    return data.result;
  }

  static async getDashboardInsights(): Promise<any[]> {
    const response = await apiFetch('/api/dashboard/insights');
    if (!response.ok) throw new Error('Failed to fetch urban planning insights');
    return response.json();
  }
}
