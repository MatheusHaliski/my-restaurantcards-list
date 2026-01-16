"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGate } from "./useAuthGate";

export default function Home() {
  const router = useRouter();
  const {
    user,
    authReady,
    authError,
    pinInput,
    setPinInput,
    pinError,
    pinVerified,
    pinChecking,
    hasAccess,
    isBlocked,
    checkingBlocked,
    handleSignIn,
    handleSignOut,
    handlePinVerify,
  } = useAuthGate();

  useEffect(() => {
    if (authReady && hasAccess) {
      router.replace("/restaurantcardspage");
    }
  }, [authReady, hasAccess, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          padding: "32px",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
          background: "#ffffff",
        }}
      >

        {!authReady && (
          <div style={{ color: "#64748b", fontSize: "14px" }}>Checking session...</div>
        )}

        {authReady && !user && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              type="button"
              onClick={handleSignIn}
              style={{
                padding: "12px 18px",
                borderRadius: "999px",
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign in with Google
            </button>
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              You must sign in before accessing the restaurant cards list.
            </div>
          </div>
        )}

        {authReady && user && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "#f8fafc",
                padding: "12px 14px",
                borderRadius: "12px",
              }}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={`${user.displayName || user.email || "User"} profile`}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid #e2e8f0",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#475569",
                  }}
                >
                  {user.displayName?.[0] ?? "U"}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                  {user.displayName || user.email || "Signed-in user"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {user.email || "Authenticated"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  marginLeft: "auto",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border: "1px solid #cbd5f5",
                  background: "#fff",
                  color: "#1e293b",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>

            {!pinVerified && !isBlocked && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "6px", color: "#0f172a" }}>
                  Enter your access PIN
                </div>
                <div style={{ color: "#475569", fontSize: "14px", marginBottom: "12px" }}>
                  This PIN is required after Google sign-in to unlock the site.
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(event) => {
                      setPinInput(event.target.value);
                    }}
                    placeholder="Enter PIN"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      minWidth: "220px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handlePinVerify}
                    disabled={pinChecking || checkingBlocked}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: pinChecking || checkingBlocked ? "#93c5fd" : "#2563eb",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: pinChecking || checkingBlocked ? "not-allowed" : "pointer",
                    }}
                  >
                    {pinChecking ? "Verifying..." : "Verify PIN"}
                  </button>
                </div>
                {pinError && (
                  <div style={{ color: "#b45309", fontSize: "12px", marginTop: 8 }}>
                    {pinError}
                  </div>
                )}
              </div>
            )}

            {pinVerified && (
              <div style={{ fontSize: "14px", color: "#16a34a" }}>
                PIN verified. Redirecting to restaurant cards...
              </div>
            )}
          </div>
        )}

        {authError && (
          <div style={{ marginTop: "16px", color: "#b45309", fontSize: "13px" }}>
            {authError}
          </div>
        )}
      </div>
    </div>
  );
}
