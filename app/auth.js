"use client";

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { firebaseApp, hasFirebaseConfig } from "./firebaseClient";

export const auth = firebaseApp ? getAuth(firebaseApp) : null;

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  if (!auth || !hasFirebaseConfig) {
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
