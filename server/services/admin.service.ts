import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { IssueRepository } from '../repositories/issue.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotificationRepository } from '../repositories/notification.repository';

export interface AdminDashboardStats {
  total_assigned: number;
  in_progress_count: number;
  resolved_count: number;
  avg_resolution_days: number;
  rating: number;
}

export class AdminService {
  static async getDashboardStats(department?: string): Promise<AdminDashboardStats> {
    const list = await IssueRepository.getAll();
    let filteredList = [...list];

    if (department && department !== 'all') {
      const deptStr = department.toLowerCase();
      filteredList = filteredList.filter(i => i.department && i.department.toLowerCase() === deptStr);
    }

    const total_assigned = filteredList.length;
    const in_progress_count = filteredList.filter(i => 
      ['investigating', 'resolving', 'In Progress', 'assigned', 'Assigned'].includes(i.status)
    ).length;
    
    // Resolved this month
    const currentMonth = new Date().toISOString().substring(0, 7);
    const resolved_count = filteredList.filter(i => {
      if (i.status !== 'resolved') return false;
      const resolvedDate = i.resolved_at || i.created_at;
      return resolvedDate && resolvedDate.startsWith(currentMonth);
    }).length;

    // Avg resolution time
    let totalDays = 0;
    let resolvedWithTimeCount = 0;
    filteredList.forEach(i => {
      if (i.status === 'resolved') {
        const start = new Date(i.created_at).getTime();
        const end = i.resolved_at ? new Date(i.resolved_at).getTime() : Date.now();
        const days = (end - start) / (24 * 3600 * 1000);
        totalDays += Math.max(0.1, days);
        resolvedWithTimeCount++;
      }
    });
    const avg_resolution_days = resolvedWithTimeCount > 0 ? parseFloat((totalDays / resolvedWithTimeCount).toFixed(1)) : 2.5;
    const rating = 4.6;

    return {
      total_assigned,
      in_progress_count,
      resolved_count,
      avg_resolution_days,
      rating
    };
  }

  static async getAdminIssues(filters: any): Promise<any[]> {
    const { status, priority, department, sort_by = 'created_at', order = 'desc' } = filters;
    let list = await IssueRepository.getAll();

    if (department && department !== 'all') {
      const deptStr = String(department).toLowerCase();
      list = list.filter(i => i.department && i.department.toLowerCase() === deptStr);
    }

    if (status && status !== 'all') {
      const statusStr = String(status).toLowerCase();
      list = list.filter(i => i.status && i.status.toLowerCase() === statusStr);
    }

    if (priority && priority !== 'all') {
      const prioStr = String(priority).toLowerCase();
      list = list.filter(i => i.severity && i.severity.toLowerCase() === prioStr);
    }

    // Sorting
    list.sort((a: any, b: any) => {
      let valA = a[sort_by as string] || '';
      let valB = b[sort_by as string] || '';

      if (sort_by === 'priority' || sort_by === 'severity') {
        const priorityWeights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        valA = priorityWeights[a.severity] || 0;
        valB = priorityWeights[b.severity] || 0;
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  static async assignIssue(issueId: string, assignedToPersonId: string): Promise<any> {
    const issue = await IssueRepository.getById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    let officerName = assignedToPersonId;
    try {
      const staffRef = doc(db, 'staff', assignedToPersonId);
      const staffSnap = await getDoc(staffRef);
      if (staffSnap.exists()) {
        officerName = staffSnap.data().name || assignedToPersonId;
      }
    } catch (staffErr) {
      console.warn("Could not retrieve staff name:", staffErr);
    }

    const updatedFields = {
      assigned_to_person: assignedToPersonId,
      status: "Assigned",
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await IssueRepository.update(issueId, updatedFields);

    // Create internal log / comment
    const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
    const commentData = {
      comment_id: commentId,
      issue_id: issueId,
      author_id: 'authority_dispatcher',
      author_name: '🛡️ Department Dispatcher',
      text: `Issue has been successfully assigned to worker: ${officerName}. Dispatch status set to ASSIGNED.`,
      upvotes: 0,
      created_at: new Date().toISOString()
    };
    await IssueRepository.addComment(issueId, commentData);

    // 1. Notify citizen
    await NotificationRepository.sendNotification(
      issueId,
      issue.created_by,
      `Your reported issue "${issue.title}" has been assigned to officer "${officerName}" for resolution.`
    );

    // 2. Notify assigned officer
    await NotificationRepository.sendNotification(
      issueId,
      assignedToPersonId,
      `You have been assigned to resolve the issue: "${issue.title}".`
    );

    return updatedFields;
  }

  static async updateIssueStatus(issueId: string, status: string, progressNote?: string): Promise<any> {
    const issue = await IssueRepository.getById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'Resolved' || status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.status = 'resolved';
    }

    await IssueRepository.update(issueId, updateData);

    // Add status change log
    const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
    const commentData = {
      comment_id: commentId,
      issue_id: issueId,
      author_id: 'authority_supervisor',
      author_name: '🛡️ Public Works Supervisor',
      text: `Status updated to ${status.toUpperCase()}.${progressNote ? ' Note: ' + progressNote : ''}`,
      upvotes: 0,
      created_at: new Date().toISOString()
    };
    await IssueRepository.addComment(issueId, commentData);

    // Notify citizen
    await NotificationRepository.sendNotification(
      issueId,
      issue.created_by,
      `Municipal Update: Your reported issue is now marked as "${status}".`
    );

    return updateData;
  }

  static async addProgressUpdate(issueId: string, note: string): Promise<any> {
    const issue = await IssueRepository.getById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    const note_id = 'note_' + Math.random().toString(36).substr(2, 9);
    const adminNoteDoc = {
      note_id,
      issue_id: issueId,
      author_id: 'authority_officer',
      text: note,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'admin_notes', note_id), adminNoteDoc);

    // 1. Notify citizen
    await NotificationRepository.sendNotification(
      issueId,
      issue.created_by,
      `New progress note added to your issue "${issue.title}": "${note}"`
    );

    // 2. Notify assigned officer
    if (issue.assigned_to_person) {
      await NotificationRepository.sendNotification(
        issueId,
        issue.assigned_to_person,
        `New progress note added to your assigned issue "${issue.title}": "${note}"`
      );
    }

    return adminNoteDoc;
  }

  static async uploadPhoto(issueId: string, photoUrl?: string): Promise<any> {
    const issue = await IssueRepository.getById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    const fallbackUrl = photoUrl || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800";
    const currentPhotos = issue.before_after_photos || [];
    const updatedPhotos = [...currentPhotos, fallbackUrl];

    await IssueRepository.update(issueId, { before_after_photos: updatedPhotos });
    return { photo_url: fallbackUrl, before_after_photos: updatedPhotos };
  }

  static async awardBadge(userId: string, badgeType: string): Promise<any> {
    const user = await UserRepository.getById(userId);
    if (!user) {
      throw new Error("User profile not found");
    }

    const currentBadges = user.badges_earned || [];
    if (currentBadges.includes(badgeType)) {
      return { status: "already_earned", badges_earned: currentBadges };
    }

    const updatedBadges = [...currentBadges, badgeType];
    const badgeId = 'badge_' + Math.random().toString(36).substr(2, 9);
    const badgeDoc = {
      badge_id: badgeId,
      user_id: userId,
      badge_type: badgeType,
      earned_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'badges', badgeId), badgeDoc);

    const pointsToAdd = 50; 
    const newPoints = (user.total_points || 0) + pointsToAdd;

    // Determine new tier
    let tier = user.tier || "New";
    if (newPoints >= 200) tier = "Trusted";
    else if (newPoints >= 50) tier = "Active";

    await UserRepository.update(userId, {
      badges_earned: updatedBadges,
      total_points: newPoints,
      tier
    });

    return {
      status: "success",
      badge_earned: badgeType,
      badges_earned: updatedBadges,
      total_points: newPoints,
      tier
    };
  }

  static async getLeaderboard(type: string, zone?: string, limit: number = 20): Promise<any[]> {
    // Seed mock users if empty, mimicking original route logic to prevent dry leaderboard
    const users = await UserRepository.getAll();
    if (users.length <= 1) {
      const mockUsers = [
        {
          user_id: "mock_user_1",
          email: "aarav.mehta@citymind.org",
          name: "Aarav Mehta",
          credibility_score: 95,
          total_issues_reported: 18,
          badges_earned: ["Problem Solver", "Road Warrior"],
          is_authority: false,
          zone: "Zone A",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_2",
          email: "ananya.iyer@citymind.org",
          name: "Ananya Iyer",
          credibility_score: 98,
          total_issues_reported: 14,
          badges_earned: ["Problem Solver", "Water Expert"],
          is_authority: false,
          zone: "Zone B",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_3",
          email: "karan.malhotra@citymind.org",
          name: "Karan Malhotra",
          credibility_score: 92,
          total_issues_reported: 11,
          badges_earned: ["Problem Solver"],
          is_authority: false,
          zone: "Zone C",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_4",
          email: "priya.sharma@citymind.org",
          name: "Priya Sharma",
          credibility_score: 100,
          total_issues_reported: 8,
          badges_earned: ["Problem Solver", "Community Champion"],
          is_authority: false,
          zone: "Zone A",
          created_at: new Date().toISOString()
        },
        {
          user_id: "mock_user_5",
          email: "rajesh.patel@citymind.org",
          name: "Rajesh Patel",
          credibility_score: 88,
          total_issues_reported: 5,
          badges_earned: ["Problem Solver"],
          is_authority: false,
          zone: "Zone B",
          created_at: new Date().toISOString()
        }
      ];

      for (const mu of mockUsers) {
        await UserRepository.create(mu);
      }
    }

    const period = new Date().toISOString().substring(0, 7); 
    const leaderboardId = `${type}_${period}`;
    const boardRef = doc(db, 'leaderboards', leaderboardId);
    const boardSnap = await getDoc(boardRef);

    if (boardSnap.exists()) {
      let entries = boardSnap.data().entries || [];
      if (entries.length > 1) {
        if (zone && zone !== 'all') {
          entries = entries.filter((e: any) => e.zone === zone);
        }
        return entries.slice(0, limit);
      }
    }

    // Dynamic calculation
    const allUsers = await UserRepository.getAll();
    let entries: any[] = [];

    if (type === 'monthly_reporters') {
      allUsers.sort((a, b) => (b.total_issues_reported || 0) - (a.total_issues_reported || 0));
      entries = allUsers.map((u, i) => ({
        rank: i + 1,
        user_id: u.user_id,
        username: u.name || u.email.split('@')[0],
        score: u.total_issues_reported || 0,
        zone: u.zone || "Zone A",
        badge_icon: u.badges_earned?.[0] || "Problem Solver"
      }));
    } else if (type === 'most_verified') {
      const verifications = await UserRepository.getAllVerifications();
      const verCounts: Record<string, number> = {};
      verifications.forEach(v => {
        verCounts[v.user_id] = (verCounts[v.user_id] || 0) + 1;
      });

      const usersWithVers = allUsers.map(u => ({
        ...u,
        verifications_count: verCounts[u.user_id] || 0
      }));

      usersWithVers.sort((a, b) => b.verifications_count - a.verifications_count);
      entries = usersWithVers.map((u, i) => ({
        rank: i + 1,
        user_id: u.user_id,
        username: u.name || u.email.split('@')[0],
        score: u.verifications_count,
        zone: u.zone || "Zone A",
        rating: u.credibility_score || 100
      }));
    } else if (type === 'fastest_departments') {
      entries = [
        { rank: 1, department_name: "Water Board", avg_resolution_time: "2.5h", score: 48 },
        { rank: 2, department_name: "Roads & Highways", avg_resolution_time: "4.1h", score: 35 },
        { rank: 3, department_name: "Public Sanitation", avg_resolution_time: "6.2h", score: 29 },
        { rank: 4, department_name: "Power & Electricity", avg_resolution_time: "8.5h", score: 21 }
      ];
    }

    await setDoc(boardRef, {
      type,
      period,
      entries,
      last_updated: new Date().toISOString()
    });

    if (zone && zone !== 'all') {
      entries = entries.filter((e: any) => e.zone === zone);
    }

    return entries.slice(0, limit);
  }

  static async getUserPoints(userId: string): Promise<any> {
    const user = await UserRepository.getById(userId);
    if (!user) {
      throw new Error("User profile not found");
    }

    const reported = user.total_issues_reported || 0;
    const verifications = await UserRepository.getAllVerifications();
    let verCount = 0;
    verifications.forEach(v => {
      if (v.user_id === userId) verCount++;
    });

    const issues = await IssueRepository.getAll();
    let resolvedCount = 0;
    issues.forEach(i => {
      if (i.created_by === userId && i.status === 'resolved') {
        resolvedCount++;
      }
    });

    const issue_pts = reported * 5;
    const ver_pts = verCount * 1;
    const res_pts = resolvedCount * 10;
    const total_points = issue_pts + ver_pts + res_pts;

    await UserRepository.update(userId, { total_points });

    return {
      total_points,
      issues: issue_pts,
      verifications: ver_pts,
      resolutions: res_pts
    };
  }
}
