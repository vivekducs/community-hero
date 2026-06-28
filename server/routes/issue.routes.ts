import express from 'express';
import { IssueController } from '../controllers/issue.controller';
import { validateRequiredFields } from '../middleware/validation.middleware';

const router = express.Router();

router.post(
  '/issues', 
  validateRequiredFields(['title', 'location']), 
  IssueController.createIssue
);

router.get('/issues', IssueController.getIssues);
router.get('/issues/map', IssueController.getIssuesMap);
router.get('/issues/:issueId', IssueController.getIssueById);

router.post(
  '/issues/:issueId/verify', 
  validateRequiredFields(['user_id', 'vote']), 
  IssueController.verifyIssue
);

router.post(
  '/issues/:issueId/comments', 
  validateRequiredFields(['user_id', 'text']), 
  IssueController.addComment
);

router.get('/issues/:issueId/comments', IssueController.getComments);
router.post('/issues/:issueId/comments/:commentId/upvote', IssueController.upvoteComment);

export default router;
