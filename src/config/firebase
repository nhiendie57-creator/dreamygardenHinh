/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: env.VITE_FIREBASE_APP_ID as string,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string || ""
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
