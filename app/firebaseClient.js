"use client";

import { initializeApp, getApps } from "firebase/app";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "funcionarioslistaapp2025",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export const hasFirebaseConfig =
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

export const firebaseApp = getApps().length
  ? getApps()[0]
  : hasFirebaseConfig
    ? initializeApp(firebaseConfig)
    : null;
