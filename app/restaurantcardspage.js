"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";

import { getRestaurants } from "./firebase";
import { FOOD_CATEGORIES } from "./categories";
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuthChanges,
} from "./auth";

type Restaurant = {
  id: string;
  name?: string;
  photo?: string;
  description?: string;
  rating?: number;
  grade?: number;

  country?: string;
  state?: string;
  city?: string;

  address?: string;
  street?: string;

  categories?: unknown;
  category?: string;
};

const getStarRating = (rating: unknown) => {
  const safeRating = Number(rating) || 0;
  const rounded = Math.max(0, Math.min(5, Math.round(safeRating)));
  return {
    rounded, // inteiro 0..5
    display: Math.max(0, Math.min(5, safeRating)), // decimal 0..5
  };
};

export default function RestaurantCardsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nameQuery, setNameQuery] = useState("");
  const [country, setCountry] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");

  // Load restaurants
  useEffect(() => {
    let isMounted = true;

    async function loadRestaurants() {
      try {
        setLoading(true);
        setError("");

        const items = await getRestaurants();
        if (isMounted) setRestaurants(items as Restaurant[]);
      } catch (err: any) {
        console.error("[RestaurantCardsPage] getRestaurants() failed:", err);

        const code = err?.code || "";
        const message = err?.message || "Unknown error";

        let friendly = "Failed to load restaurants.";

        if (
          code === "permission-denied" ||
          String(message).toLowerCase().includes("missing or insufficient permissions")
        ) {
          friendly =
            "Permission denied (Firestore Rules). You must allow read access to 'restaurants' or sign in.";
        }

        if (
          String(message).toLowerCase().includes("not configured") ||
          String(message).toLowerCase().includes("missing firebase env vars") ||
          String(message).toLowerCase().includes("firebase app was not initialized")
        ) {
          friendly =
            "Firebase config is missing. Check .env.local (NEXT_PUBLIC_FIREBASE_*) and restart `npm run dev`.";
        }

        if (code === "auth/unauthorized-domain") {
          friendly =
            "Unauthorized domain for Google Sign-In. Add your domain in Firebase Auth > Settings > Authorized domains.";
        }

        if (isMounted) {
          setError(`${friendly}\n\n[debug] ${code || "no-code"}: ${message}`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRestaurants();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser: User | null) => {
      setUser(nextUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("[RestaurantCardsPage] signInWithGoogle failed:", err);
      setAuthError(
        err?.code === "auth/unauthorized-domain"
          ? "Unauthorized domain for Google Sign-In. Add your domain in Firebase Auth > Settings > Authorized domains."
          : "Unable to sign in with Google."
      );
    }
  };

  const handleSignOut = async () => {
    setAuthError("");
    try {
      await signOutUser();
    } catch (err) {
      console.error("[RestaurantCardsPage] signOutUser failed:", err);
      setAuthError("Unable to sign out right now.");
    }
  };

  // Dependent filter options
  const availableCountries = useMemo(() => {
    const options = new Set<string>();
    restaurants.forEach((r) => r.country && options.add(r.country));
    return Array.from(options).sort();
  }, [restaurants]);

  const availableStates = useMemo(() => {
    const options = new Set<string>();
    restaurants.forEach((r) => {
      if (country && r.country !== country) return;
      if (r.state) options.add(r.state);
    });
    return Array.from(options).sort();
  }, [restaurants, country]);

  const availableCities = useMemo(() => {
    const options = new Set<string>();
    restaurants.forEach((r) => {
      if (country && r.country !== country) return;
      if (stateValue && r.state !== stateValue) return;
      if (r.city) options.add(r.city);
    });
    return Array.from(options).sort();
  }, [restaurants, country, stateValue]);

  // Reset dependent filters when parent changes
  useEffect(() => {
    // ao trocar country, limpa state/city
    setStateValue("");
    setCity("");
  }, [country]);

  useEffect(() => {
    // ao trocar state, limpa city
    setCity("");
  }, [stateValue]);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = nameQuery.trim().toLowerCase();
    const selectedCategory = category.trim().toLowerCase();

    return restaurants.filter((r) => {
      const matchesName = normalizedQuery
        ? String(r.name || "").toLowerCase().includes(normalizedQuery)
        : true;

      const matchesCountry = country ? r.country === country : true;
      const matchesState = stateValue ? r.state === stateValue : true;
      const matchesCity = city ? r.city === city : true;

      const matchesCategory = selectedCategory
        ? Array.isArray(r.categories)
          ? (r.categories as unknown[]).some(
              (value) => String(value || "").toLowerCase() === selectedCategory
            )
          : String(r.category || "").toLowerCase() === selectedCategory
        : true;

      return (
        matchesName &&
        matchesCountry &&
        matchesState &&
        matchesCity &&
        matchesCategory
      );
    });
  }, [restaurants, nameQuery, country, stateValue, city, category]);

  return (
    <div style={{ padding: "32px", fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "linear-gradient(135deg, #2563eb, #1e40af)",
          color: "#fff",
          borderRadius: "16px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Logo + título */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src="/friendly-eats.svg"
            alt="FriendlyEats logo"
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              objectFit: "cover",
              background: "#fff",
            }}
          />

          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>
              FriendlyEats
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>
              Discover great places to eat
            </div>
          </div>
        </div>

        {/* Auth info */}
        <div style={{ textAlign: "right", minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={`${user.displayName || user.email || "User"} profile`}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid rgba(255,255,255,0.6)",
                  marginBottom: "6px",
                }}
              />
            ) : (
              <div style={{ fontSize: "14px", opacity: 0.95, marginBottom: 6 }}>
                Guest
              </div>
            )}
          </div>

          <div style={{ fontWeight: 600 }}>
            {user?.displayName || user?.email || "Guest"}
          </div>

          {authError && (
            <div style={{ fontSize: "12px", color: "#fde68a", marginTop: 6 }}>
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={user ? handleSignOut : handleSignIn}
            style={{
              marginTop: "8px",
              padding: "6px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.6)",
              background: "transparent",
              color: "#fff",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {user ? "Sign out" : "Sign in with Google"}
          </button>
        </div>
      </header>

      <section
        style={{
          marginTop: "24px",
          padding: "16px",
          borderRadius: "12px",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          <input
            type="text"
            value={nameQuery}
            onChange={(event) => setNameQuery(event.target.value)}
            placeholder="Search by name"
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          />

          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="">All countries</option>
            {availableCountries.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={stateValue}
            onChange={(event) => setStateValue(event.target.value)}
            disabled={!availableStates.length}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: !availableStates.length ? "#f3f4f6" : "#fff",
            }}
          >
            <option value="">All states</option>
            {availableStates.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            disabled={!availableCities.length}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: !availableCities.length ? "#f3f4f6" : "#fff",
            }}
          >
            <option value="">All cities</option>
            {availableCities.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="">All categories</option>
            {FOOD_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section style={{ marginTop: "24px" }}>
        {loading && <p>Loading restaurants...</p>}

        {!loading && error && (
          <p style={{ color: "#b91c1c", fontWeight: 600, whiteSpace: "pre-wrap" }}>
            {error}
          </p>
        )}

        {!l
