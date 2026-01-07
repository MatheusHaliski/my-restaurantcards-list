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
  apiKey: "AIzaSyA_pHu5ASG9PAhmcEwxcckXGovRWYW0Mic",
  authDomain: "funcionarioslistaapp2025.firebaseapp.com",
  projectId: "funcionarioslistaapp2025",
  storageBucket: "funcionarioslistaapp2025.firebasestorage.app",
  messagingSenderId: "457209482063",
  appId: "1:457209482063:web:3fc5d0f3aedd2e7ebe133a",
  measurementId: "G-34JDWQ1ZXW"
};

export const hasFirebaseConfig =
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

export const firebaseApp = getApps().length
  ? getApps()[0]
  : hasFirebaseConfig
    ? initializeApp(firebaseConfig)
    : null;
