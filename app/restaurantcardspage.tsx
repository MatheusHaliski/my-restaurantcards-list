"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getFirestore, updateDoc } from "firebase/firestore";

import { getRestaurants } from "./firebase";
import {
  FOOD_CATEGORIES,
  getCategoryIcon,
  normalizeCategoryLabel,
} from "./categories";
import { firebaseApp, hasFirebaseConfig } from "./firebaseClient";
import { useAuthGate } from "./useAuthGate";

type Restaurant = {
  id: string;
  name?: string;
  photo?: string;
  fallbackApplied?: boolean;
  fallbackapplied?: boolean;

  rating?: number;
  grade?: number;
  starsgiven?: number;

  country?: string;
  state?: string;
  city?: string;

  address?: string;
  street?: string;

  categories?: unknown;
  category?: string;
};

const db = firebaseApp ? getFirestore(firebaseApp) : null;
const parseRatingValue = (rating: unknown) => {
  if (typeof rating === "number" && !Number.isNaN(rating)) return rating;
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

const getStarRating = (rating: unknown) => {
  const safe = parseRatingValue(rating);
  const rounded = Math.max(0, Math.min(5, Math.round(safe)));
  return { rounded, display: Math.max(0, Math.min(5, safe)) };
};

// --------------------
// Flags via /public PNG
// --------------------
type FlagAsset = {
  alt: string;
  src: string; // e.g. "/brasil.png"
};

const COUNTRY_FLAG_PNG: Record<string, FlagAsset> = {
  // normalize para minúsculo no lookup
  brasil: { alt: "Brasil", src: "/brasil.png" },
  brazil: { alt: "Brasil", src: "/brasil.png" },
  br: { alt: "Brasil", src: "/brasil.png" },

  canada: { alt: "Canada", src: "/canada.png" },
  ca: { alt: "Canada", src: "/canada.png" },

  "estados unidos": { alt: "Estados Unidos", src: "/estados-unidos.png" },
  "estados-unidos": { alt: "Estados Unidos", src: "/estados-unidos.png" },
  "united states": { alt: "Estados Unidos", src: "/estados-unidos.png" },
  usa: { alt: "Estados Unidos", src: "/estados-unidos.png" },
  us: { alt: "Estados Unidos", src: "/estados-unidos.png" },
};

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[._]/g, "-");

const CAFE_CATEGORY_SET = new Set([
  "cafes",
  "cafeteria",
  "hong kong style cafe",
  "themed cafes",
]);
const SANDWICH_CATEGORY_SET = new Set([
  "sandwiches",
  "sandwich shop",
  "sandwich shops",
  "sandwiches & wraps",
  "sandwiches and wraps",
]);

const getCategoryValues = (restaurant: Restaurant) => {
  if (Array.isArray(restaurant.categories)) {
    return restaurant.categories.map((item) =>
      normalizeCategoryLabel(String(item))
    );
  }
  if (typeof restaurant.categories === "string") {
    return restaurant.categories
      .split(",")
      .map((item) => normalizeCategoryLabel(item))
      .filter(Boolean);
  }
  if (restaurant.category) {
    return [normalizeCategoryLabel(String(restaurant.category))];
  }
  return [];
};

const hasCafeCategory = (restaurant: Restaurant) =>
  getCategoryValues(restaurant).some((category) =>
    CAFE_CATEGORY_SET.has(category.trim().toLowerCase())
  );
const hasSandwichCategory = (restaurant: Restaurant) =>
  getCategoryValues(restaurant).some((category) =>
    SANDWICH_CATEGORY_SET.has(category.trim().toLowerCase())
  );

function getCountryFlagPng(countryName: string | undefined | null): FlagAsset | null {
  if (!countryName) return null;
  const key = normalizeKey(countryName);
  return COUNTRY_FLAG_PNG[key] ?? null;
}

const NEW_YORK_ADDRESS_REGEX = /\b\d+\s+[^,]+,?\s*new york\b/i;

const getNormalizedLocation = (restaurant: Restaurant) => {
  const sourceAddress = [restaurant.address, restaurant.street]
    .filter(Boolean)
    .join(", ");

  if (sourceAddress && NEW_YORK_ADDRESS_REGEX.test(sourceAddress)) {
    return {
      city: "New York",
      state: "NY",
      country: "USA",
    };
  }

  return {
    city: restaurant.city,
    state: restaurant.state,
    country: restaurant.country,
  };
};

// --------------------
// Reusable SearchSelect
// --------------------
function SearchSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled,
  getOptionKey,
  getOptionLabel,
  renderOption,
  renderValue,
  includeAllOption,
  allLabel,
}: {
  value: T;
  options: T[];
  onChange: (next: T) => void;

  placeholder: string;
  searchPlaceholder: string;

  disabled?: boolean;

  getOptionKey?: (opt: T) => string;
  getOptionLabel: (opt: T) => string;

  // como desenhar cada item na lista (opcional)
  renderOption?: (opt: T, selected: boolean) => React.ReactNode;

  // como desenhar o valor selecionado no botão (opcional)
  renderValue?: (opt: T) => React.ReactNode;

  includeAllOption?: boolean; // exemplo: "All countries"
  allLabel?: string; // label do All
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hasValue = Boolean(value);
  const buttonLabel = hasValue
    ? renderValue
      ? renderValue(value)
      : getOptionLabel(value)
    : allLabel ?? placeholder;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    return options.filter((opt) =>
      getOptionLabel(opt).toLowerCase().includes(q)
    );
  }, [options, query, getOptionLabel]);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = setTimeout(() => {
      const input = rootRef.current?.querySelector<HTMLInputElement>(
        'input[data-searchselect="1"]'
      );
      input?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          background: disabled ? "#f3f4f6" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {buttonLabel}
        </span>
        <span style={{ opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
            <input
              data-searchselect="1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {includeAllOption ? (
              <button
                type="button"
                onClick={() => {
                  onChange("" as T);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  textAlign: "left",
                  background: !value ? "#eff6ff" : "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {allLabel ?? placeholder}
              </button>
            ) : null}

            {filteredOptions.length === 0 ? (
              <div style={{ padding: "10px 12px", color: "#6b7280" }}>
                No matches.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const key = getOptionKey ? getOptionKey(opt) : String(opt);
                const selected = opt === value;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      textAlign: "left",
                      background: selected ? "#eff6ff" : "#fff",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span>
                      {renderOption ? renderOption(opt, selected) : getOptionLabel(opt)}
                    </span>
                    {selected ? <span style={{ opacity: 0.8 }}>✓</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RestaurantCardsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const updatedPhotoIdsRef = useRef(new Set<string>());

  const [nameQuery, setNameQuery] = useState("");

  const [country, setCountry] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [starsFilter, setStarsFilter] = useState("");

  const router = useRouter();
  const { user, authReady, authError, hasAccess, handleSignOut } = useAuthGate();

  useEffect(() => {
    if (authReady && !hasAccess) {
      router.replace("/");
    }
  }, [authReady, hasAccess, router]);

  // Load restaurants
  useEffect(() => {
    let isMounted = true;

    async function loadRestaurants() {
      try {
        if (!hasAccess) {
          setLoading(false);
          return;
        }
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
          friendly = "";
          router.replace("/");
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
          if (friendly) {
            setError(`${friendly}\n\n[debug] ${code || "no-code"}: ${message}`);
          } else {
            setError("");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRestaurants();
    return () => {
      isMounted = false;
    };
  }, [hasAccess]);

  useEffect(() => {
    if (!db || !hasFirebaseConfig) return;

    const pendingUpdates = restaurants.filter(
      (restaurant) =>
        Boolean(restaurant.fallbackApplied ?? restaurant.fallbackapplied) &&
        ((hasCafeCategory(restaurant) &&
          restaurant.photo !== "/fallbackcafe.png") ||
          (hasSandwichCategory(restaurant) &&
            restaurant.photo !== "/fallbacksandwich.png")) &&
        !updatedPhotoIdsRef.current.has(restaurant.id)
    );

    if (pendingUpdates.length === 0) return;

    pendingUpdates.forEach((restaurant) => {
      const nextPhoto = hasSandwichCategory(restaurant)
        ? "/fallbacksandwich.png"
        : "/fallbackcafe.png";
      updatedPhotoIdsRef.current.add(restaurant.id);
      updateDoc(doc(db, "restaurants", restaurant.id), {
        photo: nextPhoto,
      })
        .then(() => {
          setRestaurants((prev) =>
            prev.map((item) =>
              item.id === restaurant.id
                ? { ...item, photo: nextPhoto }
                : item
            )
          );
        })
        .catch((err) => {
          updatedPhotoIdsRef.current.delete(restaurant.id);
          console.error(
            "[RestaurantCardsPage] Failed to update photo for fallback cafe:",
            err
          );
        });
    });
  }, [restaurants]);

  const normalizedRestaurants = useMemo(
    () =>
      restaurants.map((restaurant) => ({
        ...restaurant,
        ...getNormalizedLocation(restaurant),
      })),
    [restaurants]
  );

  // Options
  const availableCountries = useMemo(() => {
    const options = new Set<string>();
    normalizedRestaurants.forEach((r) => r.country && options.add(r.country));
    return Array.from(options).sort();
  }, [normalizedRestaurants]);

  const availableStates = useMemo(() => {
    const options = new Set<string>();
    normalizedRestaurants.forEach((r) => {
      if (country && r.country !== country) return;
      if (r.state) options.add(r.state);
    });
    return Array.from(options).sort();
  }, [normalizedRestaurants, country]);

  const availableCities = useMemo(() => {
    const options = new Set<string>();
    normalizedRestaurants.forEach((r) => {
      if (country && r.country !== country) return;
      if (stateValue && r.state !== stateValue) return;
      if (r.city) options.add(r.city);
    });
    return Array.from(options).sort();
  }, [normalizedRestaurants, country, stateValue]);

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];
    FOOD_CATEGORIES.forEach((category) => {
      const normalized = normalizeCategoryLabel(category);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push(normalized);
    });
    return options.sort((a, b) => a.localeCompare(b));
  }, []);

  // Reset dependents
  useEffect(() => {
    setStateValue("");
    setCity("");
  }, [country]);

  useEffect(() => {
    setCity("");
  }, [stateValue]);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = nameQuery.trim().toLowerCase();
    const selectedCategory = category.trim().toLowerCase();
    const minimumStars = starsFilter ? Number(starsFilter) : null;

    return normalizedRestaurants.filter((r) => {
      const matchesName = normalizedQuery
        ? String(r.name || "").toLowerCase().includes(normalizedQuery)
        : true;

      const matchesCountry = country ? r.country === country : true;
      const matchesState = stateValue ? r.state === stateValue : true;
      const matchesCity = city ? r.city === city : true;

      const matchesCategory = selectedCategory
        ? getCategoryValues(r).some(
            (value) => value.toLowerCase() === selectedCategory
          )
        : true;

      const matchesStars =
        minimumStars === null ? true : parseRatingValue(r.starsgiven) >= minimumStars;

      return (
        matchesName &&
        matchesCountry &&
        matchesState &&
        matchesCity &&
        matchesCategory &&
        matchesStars
      );
    });
  }, [
    normalizedRestaurants,
    nameQuery,
    country,
    stateValue,
    city,
    category,
    starsFilter,
  ]);

  if (!authReady || !hasAccess) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#475569",
          fontSize: "14px",
          padding: "24px",
        }}
      >
        Checking access...
      </div>
    );
  }

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
            <div style={{ fontSize: "20px", fontWeight: 700 }}>FriendlyEats</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>
              Discover great places to eat
            </div>
          </div>
        </div>

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

          <div style={{ fontWeight: 600 }}>{user?.displayName || user?.email || "Guest"}</div>

          {authError && (
            <div style={{ fontSize: "12px", color: "#fde68a", marginTop: 6 }}>
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
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
            Sign out
          </button>
        </div>
      </header>
      {hasAccess && (
        <>
      {/* Filters */}
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

          {/* COUNTRY (PNG flags) */}
          <SearchSelect
            value={country}
            options={availableCountries}
            onChange={setCountry}
            placeholder="All countries"
            allLabel="All countries"
            includeAllOption
            searchPlaceholder="Search country…"
            getOptionLabel={(opt) => opt}
            renderValue={(opt) => {
              const flag = getCountryFlagPng(opt);
              return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {flag ? (
                    <img
                      src={flag.src}
                      alt={flag.alt}
                      style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }}
                    />
                  ) : (
                    <span aria-hidden="true">🌍</span>
                  )}
                  <span>{opt}</span>
                </span>
              );
            }}
            renderOption={(opt) => {
              const flag = getCountryFlagPng(opt);
              return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {flag ? (
                    <img
                      src={flag.src}
                      alt={flag.alt}
                      style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }}
                    />
                  ) : (
                    <span aria-hidden="true">🌍</span>
                  )}
                  <span>{opt}</span>
                </span>
              );
            }}
          />

          {/* STATE (same dropdown pattern) */}
          <SearchSelect
            value={stateValue}
            options={availableStates}
            onChange={setStateValue}
            placeholder="All states"
            allLabel="All states"
            includeAllOption
            searchPlaceholder="Search state…"
            getOptionLabel={(opt) => opt}
            disabled={!availableStates.length}
          />

          {/* CITY (same dropdown pattern) */}
          <SearchSelect
            value={city}
            options={availableCities}
            onChange={setCity}
            placeholder="All cities"
            allLabel="All cities"
            includeAllOption
            searchPlaceholder="Search city…"
            getOptionLabel={(opt) => opt}
            disabled={!availableCities.length}
          />

          {/* CATEGORY (same dropdown + icon) */}
          <SearchSelect
            value={category}
            options={availableCategories}
            onChange={setCategory}
            placeholder="All categories"
            allLabel="All categories"
            includeAllOption
            searchPlaceholder="Search category…"
            getOptionLabel={(opt) => opt}
            renderValue={(opt) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">{getCategoryIcon(opt)}</span>
                <span>{opt}</span>
              </span>
            )}
            renderOption={(opt) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">{getCategoryIcon(opt)}</span>
                <span>{opt}</span>
              </span>
            )}
          />

          {/* STARS (same dropdown pattern) */}
          <SearchSelect
            value={starsFilter}
            options={["1", "2", "3", "4", "5"]}
            onChange={setStarsFilter}
            placeholder="All star ratings"
            allLabel="All star ratings"
            includeAllOption
            searchPlaceholder="Search stars…"
            getOptionLabel={(opt) => `${opt}+ stars`}
          />
        </div>
      </section>

      {/* Results */}
      <section style={{ marginTop: "24px" }}>
        {loading && <p>Loading restaurants...</p>}

        {!loading && error && (
          <p style={{ color: "#b91c1c", fontWeight: 600, whiteSpace: "pre-wrap" }}>
            {error}
          </p>
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
          {filteredRestaurants.map((restaurant) => {
            const ratingValueRaw =
              restaurant.starsgiven ?? restaurant.rating ?? restaurant.grade ?? 0;

            const { rounded, display } = getStarRating(ratingValueRaw);
            const categoryValues = getCategoryValues(restaurant);
            const cafeCategorySet = new Set([
              "cafes",
              "cafeteria",
              "hong kong style cafe",
              "themed cafes",
            ]);
            const hasCafeCategory = categoryValues.some((category) =>
              cafeCategorySet.has(category.trim().toLowerCase())
            );
            const fallbackApplied = Boolean(
              restaurant.fallbackApplied ?? restaurant.fallbackapplied
            );
            const cardImageSrc = fallbackApplied && hasCafeCategory
              ? "/fallbackcafe.png"
              : restaurant.photo;

            return (
              <Link
                key={restaurant.id}
                href={`/restaurantinfopage/${restaurant.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  {cardImageSrc ? (
                    <img
                      src={cardImageSrc}
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: "18px", lineHeight: 1.2 }}>
                        {restaurant.name || "Unnamed Restaurant"}
                      </h3>

                      <span
                        aria-label={`Restaurant rating ${display.toFixed(1)} out of 5`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            gap: "2px",
                            fontSize: "16px",
                            lineHeight: 1,
                          }}
                        >
                          {Array.from({ length: 5 }, (_, index) => (
                            <span
                              key={`star-${restaurant.id}-${index}`}
                              style={{
                                color: index < rounded ? "#f59e0b" : "#d1d5db",
                              }}
                            >
                              ★
                            </span>
                          ))}
                        </span>

                        <span style={{ fontSize: "13px", color: "#374151" }}>
                          {display.toFixed(1)}
                        </span>
                      </span>
                    </div>

                    <p style={{ margin: "10px 0 0", color: "#6b7280" }}>
                      {[
                        restaurant.address,
                        restaurant.street,
                        restaurant.city,
                        restaurant.state,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Address unavailable."}
                    </p>

                    <div style={{ marginTop: 10, fontSize: "13px", color: "#374151" }}>
                      <div>
                        {restaurant.city || "Unknown city"}
                        {restaurant.state ? `, ${restaurant.state}` : ""}
                      </div>

                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {restaurant.country ? (
                          (() => {
                            const flag = getCountryFlagPng(restaurant.country);
                            return (
                              <>
                                {flag ? (
                                  <img
                                    src={flag.src}
                                    alt={flag.alt}
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 4,
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <span aria-hidden="true">🌍</span>
                                )}
                                <span>{restaurant.country}</span>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <span aria-hidden="true">🌍</span>
                            <span>Unknown country</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>

        </>
      )}
    </div>
  );
}
