"use client";

import type { User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  type FieldValue,
} from "firebase/firestore";

import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuthChanges,
} from "../../auth";
import { firebaseApp, hasFirebaseConfig } from "../../firebaseClient";
import { getCategoryIcon, normalizeCategoryLabel } from "../../categories";

type RestaurantRecord = Record<string, unknown> & { id?: string };

type ReviewRecord = {
  id: string;
  createdAt?: string;
  grade?: number;
  rating?: number;
  restaurantId?: string;
  text?: string;

  // ✅ serverTimestamp() returns FieldValue; reads return Timestamp
  timestamp?: Timestamp | FieldValue | null;

  userDisplayName?: string;
  userEmail?: string;
  userId?: string;
  userPhoto?: string;
};

const db = firebaseApp ? getFirestore(firebaseApp) : null;

const toDateValue = (review: ReviewRecord) => {
  if (review.createdAt) {
    return new Date(review.createdAt);
  }

  // ✅ If timestamp is a real Firestore Timestamp, it has toDate()
  const ts = review.timestamp as Timestamp | undefined;
  if (ts && typeof (ts as any).toDate === "function") {
    return ts.toDate();
  }

  // ✅ FieldValue from serverTimestamp() (before server resolves) -> keep stable
  return new Date(0);
};

const parseRatingValue = (rating: unknown) => {
  if (typeof rating === "number" && !Number.isNaN(rating)) {
    return rating;
  }
  if (typeof rating === "string") {
    const normalized = rating.trim().replace(",", ".");
    const match = normalized.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
};

const getStarString = (rating: number) => {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  return Array.from({ length: 5 }, (_, index) =>
    index < safeRating ? "★" : "☆"
  ).join("");
};

const getFlagSrc = (country: string) => {
  const normalized = country.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("canada")) return "/canada.png";
  if (normalized.includes("brazil") || normalized.includes("brasil")) {
    return "/brasil.png";
  }
  if (
    normalized.includes("united states") ||
    normalized.includes("usa") ||
    normalized.includes("estados")
  ) {
    return "/estados-unidos.png";
  }
  return "";
};

export default function RestaurantInfoPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [restaurant, setRestaurant] = useState<RestaurantRecord | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ typed auth user (removes implicit any issues)
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser: User | null) => {
      setUser(nextUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) {
      setError("Restaurant not found.");
      setLoading(false);
      return () => {};
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        if (!db || !hasFirebaseConfig) {
          throw new Error("Firestore is not configured.");
        }

        const restaurantRef = doc(db, "restaurants", id);
        const restaurantSnap = await getDoc(restaurantRef);

        if (!restaurantSnap.exists()) {
          throw new Error("Restaurant not found.");
        }

        const reviewQuery = query(
          collection(db, "review"),
          where("restaurantId", "==", id)
        );
        const reviewSnap = await getDocs(reviewQuery);
        const reviewItems = reviewSnap.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        reviewItems.sort(
          (a, b) =>
            toDateValue(b as ReviewRecord).getTime() -
            toDateValue(a as ReviewRecord).getTime()
        );

        if (isMounted) {
          setRestaurant({ id: restaurantSnap.id, ...restaurantSnap.data() });
          setReviews(reviewItems as ReviewRecord[]);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Unable to load restaurant details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSignIn = async () => {
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch {
      setAuthError("Unable to sign in with Google.");
    }
  };

  const handleSignOut = async () => {
    setAuthError("");
    try {
      await signOutUser();
    } catch {
      setAuthError("Unable to sign out right now.");
    }
  };

  const reviewAverage = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, review) => {
      const value = parseRatingValue(review.rating ?? review.grade ?? 0);
      return sum + value;
    }, 0);
    return total / reviews.length;
  }, [reviews]);

  const restaurantRating = useMemo(() => {
    if (!restaurant) return 0;
    const directRating = parseRatingValue(
      (restaurant as any).rating ?? (restaurant as any).grade ?? 0
    );
    return reviews.length ? reviewAverage : directRating;
  }, [restaurant, reviewAverage, reviews.length]);

  useEffect(() => {
    if (!db || !hasFirebaseConfig || !id || !restaurant) return;

    const nextStars = Number(reviewAverage.toFixed(2));
    const currentStars = parseRatingValue((restaurant as any).starsgiven ?? 0);

    if (nextStars === Number(currentStars.toFixed(2))) {
      return;
    }

    const restaurantRef = doc(db, "restaurants", id);
    updateDoc(restaurantRef, { starsgiven: nextStars })
      .then(() => {
        setRestaurant((prev) =>
          prev ? { ...prev, starsgiven: nextStars } : prev
        );
      })
      .catch((err) => {
        console.error("Failed to sync starsgiven:", err);
      });
  }, [id, restaurant, reviewAverage, db, hasFirebaseConfig]);

  const restaurantDetails = useMemo(() => {
    if (!restaurant) return [] as [string, unknown][];
    return Object.entries(restaurant);
  }, [restaurant]);

  const hiddenDetailKeys = useMemo(
    () =>
      new Set([
        "id",
        "stars",
        "review_count",
        "fallbackapplied",
        "photo",
        "fallbacktype",
      ]),
    []
  );

  const categoryKeys = useMemo(
    () => new Set(["categories", "category", "cuisine", "cuisines"]),
    []
  );

  const categoryEntry = useMemo(
    () =>
      restaurantDetails.find(([key]) =>
        categoryKeys.has(String(key).toLowerCase())
      ),
    [restaurantDetails, categoryKeys]
  );

  const categoryList = useMemo(() => {
    if (!categoryEntry) return [] as string[];
    const [, value] = categoryEntry;
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeCategoryLabel(String(item)))
        .filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => normalizeCategoryLabel(item))
        .filter(Boolean);
    }
    if (value) {
      return [normalizeCategoryLabel(String(value))];
    }
    return [];
  }, [categoryEntry]);

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      setSubmitError("Please sign in to leave a review.");
      return;
    }
    if (!id) {
      setSubmitError("Restaurant details are missing.");
      return;
    }
    if (!reviewText.trim()) {
      setSubmitError("Please add your review commentary.");
      return;
    }
    if (!db || !hasFirebaseConfig) {
      setSubmitError("Firestore is not configured.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");

      const payload = {
        createdAt: new Date().toISOString(),
        grade: reviewRating,
        rating: reviewRating,
        restaurantId: id,
        text: reviewText.trim(),

        // ✅ Firestore will resolve this server-side
        timestamp: serverTimestamp(),

        userDisplayName: user.displayName || "Anonymous",
        userEmail: user.email || "",
        userId: user.uid || "",
        userPhoto: user.photoURL || "",
      };

      const docRef = await addDoc(collection(db, "review"), payload);

      // ✅ For immediate UI ordering, use a local Timestamp
      const newReview: ReviewRecord = {
        id: docRef.id,
        ...payload,
        timestamp: Timestamp.fromDate(new Date()),
      };

      setReviews((prev) => [newReview, ...prev]);
      setReviewText("");
      setReviewRating(0);
    } catch (err: any) {
      setSubmitError(err?.message || "Unable to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "32px", fontFamily: "Arial, sans-serif" }}>
        <p>Loading restaurant details...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div style={{ padding: "32px", fontFamily: "Arial, sans-serif" }}>
        <p style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error || "Restaurant not found."}
        </p>
      </div>
    );
  }

  const addressLine = [
    (restaurant as any).address,
    (restaurant as any).country,
  ]
    .filter(Boolean)
    .join(" • ");
  const cityName = String((restaurant as any).city || "");
  const stateName = String((restaurant as any).state || "");
  const countryName = String((restaurant as any).country || "");
  const flagSrc = getFlagSrc(countryName);
  const streetAddress = String((restaurant as any).address || "");
  const locationParts = [streetAddress, cityName, stateName, countryName].filter(
    Boolean
  );
  const locationQuery = locationParts.join(", ");
  const mapsLink = locationQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        locationQuery
      )}`
    : "";
  const mapsEmbed = locationQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        locationQuery
      )}&output=embed`
    : "";

  return (
    <div
      style={{
        padding: "32px",
        fontFamily: "Arial, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
          color: "#fff",
          borderRadius: "18px",
          overflow: "hidden",
          marginBottom: "28px",
          boxShadow: "0 12px 30px rgba(37, 99, 235, 0.35)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(200px, 320px) 1fr",
            gap: "24px",
            padding: "24px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#1e293b",
            }}
          >
            {(restaurant as any).photo ? (
              <img
                src={String((restaurant as any).photo)}
                alt={String((restaurant as any).name || "Restaurant")}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div aria-hidden="true" style={{ width: "100%", height: "100%" }} />
            )}
          </div>

          <div>
            <p style={{ margin: 0, fontSize: "14px", color: "#dbeafe" }}>
              Restaurant details
            </p>

            {/* Nome */}
            <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 600 }}>
              {String((restaurant as any).name || "Restaurant")}
            </p>

            {/* Address + Country */}
            <h1
              style={{
                margin: "8px 0 6px",
                fontSize: "28px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {flagSrc ? (
                <img
                  src={flagSrc}
                  alt={countryName ? `${countryName} flag` : "Country flag"}
                  style={{
                    width: "36px",
                    height: "24px",
                    borderRadius: "6px",
                    objectFit: "cover",
                    boxShadow: "0 4px 10px rgba(15, 23, 42, 0.3)",
                  }}
                />
              ) : null}
              <span>{addressLine || "Address unavailable"}</span>
            </h1>

            {/* Rating */}
            <div style={{ marginTop: "16px", fontSize: "18px" }}>
              <span
                aria-label={`Restaurant rating ${restaurantRating} out of 5`}
                style={{ color: "#facc15", fontWeight: 700 }}
              >
                {getStarString(restaurantRating)}
              </span>
              <span style={{ marginLeft: "10px", color: "#e2e8f0" }}>
                {restaurantRating.toFixed(1)} / 5
              </span>
            </div>
          </div>

        </div>
      </header>

      <section
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "20px 24px",
          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Restaurant information</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #e0f2fe, #eff6ff)",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #bfdbfe",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#1e3a8a",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Categories
            </p>
            {categoryList.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {categoryList.map((category) => (
                  <span
                    key={category}
                    style={{
                      background: "#1d4ed8",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span aria-hidden="true">{getCategoryIcon(category)}</span>
                    <span>{category}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#475569" }}>
                No categories listed yet.
              </p>
            )}
          </div>

          <div
            style={{
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Quick details
            </p>
            <div
              style={{
                display: "grid",
                gap: "16px",
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  { label: "City", value: cityName },
                  { label: "State", value: stateName },
                  { label: "Country", value: countryName },
                ].map((detail) => (
                  <div key={detail.label}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {detail.label}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        marginTop: "4px",
                        color: "#1d4ed8",
                        background: "#eff6ff",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      {detail.value || "Unavailable"}
                    </div>
                  </div>
                ))}
              </div>

              {mapsEmbed ? (
                <div
                  style={{
                    position: "relative",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    minHeight: "220px",
                  }}
                >
                  <iframe
                    title="Restaurant location map"
                    src={mapsEmbed}
                    style={{ border: 0, width: "100%", height: "240px" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open location in Google Maps"
                    style={{
                      position: "absolute",
                      inset: 0,
                      textIndent: "-9999px",
                    }}
                  >
                    Open in Google Maps
                  </a>
                </div>
              ) : (
                <p style={{ margin: 0, color: "#64748b" }}>
                  Location map unavailable.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>Reviews</h2>

          <div>
            {user ? (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ color: "#475569" }}>
                  Signed in as {user.displayName || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  style={{
                    border: "1px solid #cbd5f5",
                    background: "#fff",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                style={{
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
                type="button"
              >
                Sign in to review
              </button>
            )}

            {authError && (
              <p style={{ marginTop: "8px", color: "#b91c1c" }}>{authError}</p>
            )}
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          {reviews.length === 0 ? (
            <p style={{ color: "#64748b" }}>No reviews yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {reviews.map((review) => (
                <li
                  key={review.id}
                  style={{
                    display: "flex",
                    gap: "14px",
                    padding: "14px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#e2e8f0",
                      flexShrink: 0,
                    }}
                  >
                    {review.userPhoto ? (
                      <img
                        src={review.userPhoto}
                        alt={review.userDisplayName || "Reviewer"}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : null}
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>{review.userDisplayName || "Anonymous reviewer"}</strong>
                      <span style={{ color: "#f59e0b" }}>
                        {getStarString(Number(review.rating ?? review.grade ?? 0))}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0", color: "#475569" }}>
                      {review.text || "No commentary provided."}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Leave a review</h3>

          {!user && (
            <p style={{ color: "#64748b" }}>
              Sign in to share your experience with this restaurant.
            </p>
          )}

          <form onSubmit={handleSubmitReview}>
            <label
              style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}
              htmlFor="review-rating"
            >
              Your rating
            </label>

            <select
              id="review-rating"
              value={reviewRating}
              onChange={(event) => setReviewRating(Number(event.target.value))}
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #cbd5f5",
                marginBottom: "16px",
                width: "160px",
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </select>

            <label
              style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}
              htmlFor="review-text"
            >
              Commentary
            </label>

            <textarea
              id="review-text"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #cbd5f5",
                resize: "vertical",
              }}
            />

            {submitError && (
              <p style={{ color: "#b91c1c", marginTop: "12px" }}>{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: "14px",
                background: submitting ? "#94a3b8" : "#16a34a",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "10px",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
