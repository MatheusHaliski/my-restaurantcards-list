"use client";

import { initializeApp, getApps } from "firebase/app";

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
