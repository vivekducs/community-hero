import express from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = express.Router();

router.post(['/upload', '/api/upload'], AuthController.uploadImage);
router.post(['/auth/register', '/api/auth/register'], AuthController.register);
router.post(['/auth/login', '/api/auth/login'], AuthController.login);
router.post(['/auth/logout', '/api/auth/logout'], AuthController.logout);
router.post(['/auth/refresh', '/api/auth/refresh'], AuthController.refresh);

router.post(['/notifications/send-fcm', '/api/notifications/send-fcm'], (req, res) => {
  const { user_id, title, body, icon_url, token } = req.body;
  console.log(`[FCM Mock] Sending push notification to ${user_id || 'unknown'} (token: ${token || 'none'})`);
  console.log(`[FCM Mock] Title: ${title}, Body: ${body}`);
  res.json({ success: true, message: "Push notification queued successfully (mock)" });
});

export default router;
