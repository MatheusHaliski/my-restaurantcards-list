"use client";

import { collection, getDocs, getFirestore } from "firebase/firestore";
import { firebaseApp, hasFirebaseConfig } from "./firebaseClient";

const db = firebaseApp ? getFirestore(firebaseApp) : null;

export const getRestaurants = async () => {
  if (!db || !hasFirebaseConfig) {
    throw new Error("Firestore is not configured.");
  }
  const snapshot = await getDocs(collection(db, "restaurants"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
