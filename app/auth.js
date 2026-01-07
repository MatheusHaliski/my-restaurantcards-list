"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "funcionarioslistaapp2025",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const hasFirebaseConfig =
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

const app = getApps().length
  ? getApps()[0]
  : hasFirebaseConfig
    ? initializeApp(firebaseConfig)
    : null;
export const auth = app ? getAuth(app) : null;

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  if (!auth) {
    return Promise.reject(new Error("Firebase auth is not configured."));
  }
  return signInWithPopup(auth, provider);
};

export const signOutUser = () => (auth ? signOut(auth) : Promise.resolve());

export const subscribeToAuthChanges = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};
