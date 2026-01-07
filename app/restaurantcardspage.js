"use client";

import { useEffect, useMemo, useState } from "react";
import { getRestaurants } from "./firebase";
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuthChanges,
} from "./auth";

export default function RestaurantCardsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");

useEffect(() => {
  let isMounted = true;

  async function loadRestaurants() {
    try {
      setLoading(true);
      setError("");

      const items = await getRestaurants();

      if (isMounted) {
        setRestaurants(items);
      }
    } catch (err) {
      // 1) Log completo no console (para dev)
      console.error("[RestaurantCardsPage] getRestaurants() failed:", err);

      // 2) Tenta extrair um "código" e uma "mensagem" do Firebase
      const code = err?.code || "";
      const message = err?.message || "Unknown error";

      // 3) Constrói uma mensagem explicativa pro usuário
      let friendly = "Failed to load restaurants.";

      // PERMISSÃO (Firestore rules)
      if (
        code === "permission-denied" ||
        message.toLowerCase().includes("missing or insufficient permissions")
      ) {
        friendly =
          "Permission denied (Firestore Rules). You must allow read access to 'restaurants' or sign in.";
      }

      // CONFIG (env/config)
      if (
        message.toLowerCase().includes("not configured") ||
        message.toLowerCase().includes("missing firebase env vars") ||
        message.toLowerCase().includes("firebase app was not initialized")
      ) {
        friendly =
          "Firebase config is missing. Check .env.local (NEXT_PUBLIC_FIREBASE_*) and restart `npm run dev`.";
      }

      // OUTROS ERROS comuns (domínio auth, etc.)
      if (code === "auth/unauthorized-domain") {
        friendly =
          "Unauthorized domain for Google Sign-In. Add your domain in Firebase Auth > Settings > Authorized domains.";
      }

      // 4) Mostra na tela o "friendly" + detalhes técnicos
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


  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch (signInError) {
      setAuthError("Unable to sign in with Google.");
    }
  };

  const handleSignOut = async () => {
    setAuthError("");
    try {
      await signOutUser();
    } catch (signOutError) {
      setAuthError("Unable to sign out right now.");
    }
  };

  const availableCountries = useMemo(() => {
    const options = new Set();
    restaurants.forEach((restaurant) => {
      if (restaurant.country) {
        options.add(restaurant.country);
      }
    });
    return Array.from(options).sort();
  }, [restaurants]);

  const availableStates = useMemo(() => {
    const options = new Set();
    restaurants.forEach((restaurant) => {
      if (restaurant.state) {
        options.add(restaurant.state);
      }
    });
    return Array.from(options).sort();
  }, [restaurants]);

  const availableCities = useMemo(() => {
    const options = new Set();
    restaurants.forEach((restaurant) => {
      if (restaurant.city) {
        options.add(restaurant.city);
      }
    });
    return Array.from(options).sort();
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = nameQuery.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesName = normalizedQuery
        ? String(restaurant.name || "").toLowerCase().includes(normalizedQuery)
        : true;
      const matchesCountry = country ? restaurant.country === country : true;
      const matchesState = state ? restaurant.state === state : true;
      const matchesCity = city ? restaurant.city === city : true;

      return matchesName && matchesCountry && matchesState && matchesCity;
    });
  }, [restaurants, nameQuery, country, state, city]);

  return (
    <div style={{ padding: "32px", fontFamily: "Arial, sans-serif" }}>
<header
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    background: "linear-gradient(135deg, #2563eb, #1e40af)", // azul
    color: "#fff",
    borderRadius: "16px",
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
  <div style={{ textAlign: "right" }}>
    <div style={{ fontSize: "14px" }}>Logged in user</div>
    <div style={{ fontWeight: 600 }}>
      {user?.displayName || user?.email || "Guest"}
    </div>

    {authError && (
      <div style={{ fontSize: "12px", color: "#fde68a" }}>
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
            value={state}
            onChange={(event) => setState(event.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
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
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="">All cities</option>
            {availableCities.map((option) => (
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
          <p style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</p>
        )}
        {!loading && !error && filteredRestaurants.length === 0 && (
          <p>No restaurants match your filters.</p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredRestaurants.map((restaurant) => (
            <article
              key={restaurant.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {restaurant.photo ? (
                <img
                  src={restaurant.photo}
                  alt={restaurant.name || "Restaurant"}
                  style={{
                    width: "100%",
                    height: "160px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    height: "160px",
                    background: "#f3f4f6",
                  }}
                />
              )}
              <div style={{ padding: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px" }}>
                  {restaurant.name || "Unnamed Restaurant"}
                </h3>
                <p style={{ margin: "8px 0", color: "#6b7280" }}>
                  {restaurant.description || "No description provided."}
                </p>
                <div style={{ fontSize: "13px", color: "#374151" }}>
                  <div>
                    {restaurant.city || "Unknown city"}, {restaurant.state || ""}
                  </div>
                  <div>{restaurant.country || "Unknown country"}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
