import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { Issue } from '../types';

export function useAdmin(initialDept: string = 'all') {
  const [department, setDepartment] = useState(initialDept);
  const [stats, setStats] = useState({
    total_assigned: 0,
    in_progress_count: 0,
    resolved_count: 0,
    avg_resolution_days: 0,
    rating: 4.6
  });
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, issuesData] = await Promise.all([
        ApiService.getAdminDashboardStats(department === 'all' ? undefined : department),
        ApiService.getAdminIssues({ department: department === 'all' ? undefined : department })
      ]);
      setStats(statsData);
      setIssues(issuesData);
    } catch (err: any) {
      console.error("Failed to load admin dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [department]);

  const assignIssue = async (issueId: string, officerId: string) => {
    try {
      await ApiService.assignIssue(issueId, officerId);
      await loadDashboardData();
    } catch (err: any) {
      console.error("Failed to assign issue:", err);
      throw err;
    }
  };

  const updateIssueStatus = async (issueId: string, status: string, progressNote?: string) => {
    try {
      await ApiService.updateIssueStatus(issueId, status, progressNote);
      await loadDashboardData();
    } catch (err: any) {
      console.error("Failed to update status:", err);
      throw err;
    }
  };

  const addProgressUpdate = async (issueId: string, note: string) => {
    try {
      const newNote = await ApiService.addProgressUpdate(issueId, note);
      await loadDashboardData();
      return newNote;
    } catch (err: any) {
      console.error("Failed to add progress note:", err);
      throw err;
    }
  };

  return {
    department,
    setDepartment,
    stats,
    issues,
    loading,
    error,
    assignIssue,
    updateIssueStatus,
    addProgressUpdate,
    reloadAdmin: loadDashboardData
  };
}
