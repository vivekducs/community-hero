import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface NotificationDoc {
  notification_id: string;
  issue_id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export class NotificationRepository {
  static async create(notification: NotificationDoc): Promise<void> {
    await setDoc(doc(db, 'notifications', notification.notification_id), notification);
  }

  static async sendNotification(issueId: string, userId: string, message: string): Promise<void> {
    const notification_id = 'notif_' + Math.random().toString(36).substr(2, 9);
    const notification: NotificationDoc = {
      notification_id,
      issue_id: issueId,
      user_id: userId || 'anonymous',
      message,
      is_read: false,
      created_at: new Date().toISOString()
    };
    await this.create(notification);
  }
}
