import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_REACT_APP_FIREBASE_API_KEY || "AIzaSyC8P6t5U8hsTK6V6LKUxKb1cNwAhqWd_KM",
  projectId: "tranquil-atom-8gbcx",
  authDomain: "tranquil-atom-8gbcx.firebaseapp.com",
  storageBucket: "tranquil-atom-8gbcx.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_REACT_APP_MESSAGING_SENDER_ID || "450881698464",
  appId: (import.meta as any).env.VITE_REACT_APP_APP_ID || "1:450881698464:web:12a3bb15bb920e7fc167c5"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-citymind-825e5b72-a31a-4304-83b7-64e929b5fded");
const storage = getStorage(app);

let messaging: any = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error("Failed to initialize messaging", err);
  }
}

export { app, auth, db, storage, messaging };
