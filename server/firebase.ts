import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_REACT_APP_FIREBASE_API_KEY || "AIzaSyC8P6t5U8hsTK6V6LKUxKb1cNwAhqWd_KM",
  projectId: "tranquil-atom-8gbcx",
  authDomain: "tranquil-atom-8gbcx.firebaseapp.com",
  storageBucket: "tranquil-atom-8gbcx.firebasestorage.app",
  messagingSenderId: "450881698464",
  appId: "1:450881698464:web:12a3bb15bb920e7fc167c5"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, "ai-studio-citymind-825e5b72-a31a-4304-83b7-64e929b5fded");
