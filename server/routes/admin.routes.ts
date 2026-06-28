import express from 'express';
import { AdminController } from '../controllers/admin.controller';
import { validateRequiredFields } from '../middleware/validation.middleware';

const router = express.Router();

router.get(['/admin/dashboard', '/api/admin/dashboard'], AdminController.getDashboardStats);
router.get(['/admin/issues', '/api/admin/issues'], AdminController.getAdminIssues);
router.get(['/admin/issues/:issue_id', '/api/admin/issues/:issue_id'], AdminController.getAdminIssueById);

router.patch(
  ['/admin/issues/:issue_id/assign', '/api/admin/issues/:issue_id/assign'], 
  validateRequiredFields(['assigned_to_person_id']), 
  AdminController.assignIssue
);

router.patch(
  ['/admin/issues/:issue_id', '/api/admin/issues/:issue_id'], 
  validateRequiredFields(['status']), 
  AdminController.updateIssueStatus
);

router.post(
  ['/admin/issues/:issue_id/progress-update', '/api/admin/issues/:issue_id/progress-update'], 
  validateRequiredFields(['note']), 
  AdminController.addProgressUpdate
);

router.post(
  ['/admin/issues/:issue_id/upload-photo', '/api/admin/issues/:issue_id/upload-photo'], 
  AdminController.uploadPhoto
);

router.post(
  ['/gamification/award-badge', '/api/gamification/award-badge'], 
  validateRequiredFields(['user_id', 'badge_type']), 
  AdminController.awardBadge
);

router.get(['/gamification/leaderboard', '/api/gamification/leaderboard'], AdminController.getLeaderboard);

router.get(
  ['/gamification/user-points/:user_id', '/api/gamification/user-points/:user_id'], 
  AdminController.getUserPoints
);

export default router;
