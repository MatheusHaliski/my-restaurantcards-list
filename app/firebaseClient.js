"use client";

import { initializeApp, getApps } from "firebase/app";
import { getApp } from "firebase/app";

console.log("FIREBASE PROJECT ID (env):", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

try {
  const app = getApp();
  console.log("FIREBASE APP OPTIONS:", app.options);
} catch (e) {
  console.log("getApp() failed:", e);
}

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? ""
};

export const hasFirebaseConfig =
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

export const firebaseApp = getApps().length
  ? getApps()[0]
  : hasFirebaseConfig
    ? initializeApp(firebaseConfig)
    : null;
