// categories.js
// =====================================================
// ✅ NOVO PADRÃO DE CATEGORIAS (LOTE ÚNICO + BASE TAGS)
// =====================================================
//
// Agora o Firestore salva categories assim:
// categories: [ LOTE, "meal_takeaway","food_delivery","meal_delivery","point_of_interest","establishment" ]
//
// Então o seu filtro do menu deve usar SOMENTE os LOTES abaixo.
// =====================================================

// Se você ainda usa "lifestyle" em outra collection, mantenha essa lista aqui.
// Caso NÃO use, você pode apagar LIFESTYLE_CATEGORIES por completo.
export const LIFESTYLE_CATEGORIES = [
  "Shopping",
  "Nightlife",
  "Entertainment",
  "Hotels",
  "Beauty & Spas",
  "Gyms",
  "Parks",
];

// ✅ LOTES (as únicas categorias que aparecem no filtro do menu)
export const FOOD_CATEGORIES = [
  "Vegan", // ✅ NOVO
  "Fast Food",
  "Italian/Pizza",
  "Japanese",
  "Brazilian",
  "Grocery",
  "Arabic",
  "Chicken Shop",
  "Açai & Bowls",
  "Argentine",
  "Bar",
  "Mexican",
  "Sandwich Shop",
  "Barbeque",
  "Bakery/Cafe",
  "Desserts",
];

// =====================================================
// ✅ Ícones (para mostrar no UI)
// =====================================================
const CATEGORY_ICON_RULES = [
  { keywords: ["vegan", "vegano", "plant based", "plant-based", "plantbased"], icon: "🥗" }, // ✅ NOVO
  { keywords: ["açai & bowls", "acai & bowls", "acai", "açaí"], icon: "🥣" },
  { keywords: ["japanese"], icon: "🍣" },
  { keywords: ["italian/pizza", "italian", "pizza"], icon: "🍕" },
  { keywords: ["mexican"], icon: "🌮" },
  { keywords: ["arabic"], icon: "🥙" },
  { keywords: ["argentine"], icon: "🇦🇷" },
  { keywords: ["desserts"], icon: "🍨" },
  { keywords: ["chicken shop"], icon: "🍗" },
  { keywords: ["sandwich shop"], icon: "🥪" },
  { keywords: ["barbeque"], icon: "🍖" },
  { keywords: ["bar"], icon: "🍸" },
  { keywords: ["bakery/cafe"], icon: "🥐" },
  { keywords: ["grocery"], icon: "🛒" },
  { keywords: ["fast food"], icon: "🍔" },
  { keywords: ["brazilian"], icon: "🇧🇷" },
];

// =====================================================
// ✅ Normalização (caso ainda apareçam categorias antigas)
// =====================================================
// Ex: "italian_restaurant" -> "Italian/Pizza"
// Ex: "pizza" -> "Italian/Pizza"
// Ex: "buffet_restaurant" -> "Fast Food"  (como você pediu antes)
// Ex: "coffee & tea" -> "Cafe"
// =====================================================

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function stripAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function norm(s) {
  return stripAccents(s).toLowerCase().trim();
}

// remove sufixos comuns quando vier snake_case do Google/Yelp
const CATEGORY_SUFFIXES = new Set([
  "restaurant",
  "restaurants",
  "bar",
  "bars",
  "cafe",
  "cafes",
  "store",
  "stores",
  "market",
  "markets",
  "shop",
  "shops",
]);

// ✅ Regras: keywords antigas -> LOTE novo
// (Ordem importa: regras mais específicas primeiro)
const LOT_RULES = [
  // ✅ NOVO: Vegan primeiro pra ter prioridade
  {
    label: "Vegan",
    keywords: [
      "vegan",
      "vegano",
      "vegana",
      "veg",
      "plant based",
      "plant-based",
      "plantbased",
      "vegetal",
      "100% vegetal",
      "healthy",
      "saudavel",
      "saudável",
      "healthy food",
      "alimentacao saudavel",
      "alimentação saudável",
      "salad",
      "salads",
      "salada",
      "saladas",
      "smoothie",
      "smoothies",
      "green juice",
      "suco verde",
      "bowl",
      "bowls",
      "vegan bowl",
      "veggie",
      "vegetariano",
      "vegetariana",
      "raw",
      "raw food",
      "organic",
      "organico",
      "orgânico",
      "organica",
      "orgânica",
    ],
  },

  { label: "Açai & Bowls", keywords: ["acai bowls", "açaí", "acai", "bowls"] },

  {
    label: "Japanese",
    keywords: [
      "japanese_restaurant",
      "japanese",
      "sushi_restaurant",
      "sushi bars",
      "sushi",
      "ramen",
      "lamen",
      "yakiniku",
      "izakaya",
      "teppanyaki",
    ],
  },

  {
    label: "Italian/Pizza",
    keywords: [
      "italian_restaurant",
      "italian",
      "ristorante",
      "trattoria",
      "cantina",
      "pasta",
      "pizza_restaurant",
      "pizza",
      "pizzaria",
      "spaghetto",
      "vino",
      "italy",
    ],
  },

  { label: "Mexican", keywords: ["mexican_restaurant", "mexican", "tex-mex", "taco", "tacos", "taqueria"] },

  { label: "Arabic", keywords: ["arabic", "middle eastern", "shawarma", "baladi", "kebab", "halal"] },

  { label: "Argentine", keywords: ["argentine", "argentina", "empanada", "empanadas", "parrilla", "medialuna"] },

  { label: "Desserts", keywords: ["dessert", "desserts", "ice cream", "frozen yogurt", "gelato", "donut", "donuts", "chocolate"] },

  { label: "Chicken Shop", keywords: ["chicken shop", "chicken wings", "wings", "kfc", "popeyes", "chick-fil-a"] },

  { label: "Sandwich Shop", keywords: ["sandwich", "sandwiches", "subway", "sub", "wrap", "hot dog", "lanchonete", "lanche"] },

  { label: "Barbeque", keywords: ["bbq", "barbeque", "barbecue", "smokehouse", "churrascaria", "grill", "steakhouse"] },

  { label: "Bar", keywords: ["bar", "bars", "pub", "lounges", "cocktail bars", "nightlife"] },

  { label: "Bakery/Cafe", keywords: ["coffee & tea", "coffee", "cafe", "cafes", "cafeteria", "tea","bakery", "bakeries", "padaria", "panificadora", "pão", "pao", "patisserie", "cake shop"] },

  { label: "Grocery", keywords: ["grocery", "international grocery", "market", "farmer", "farmers market", "deli", "delicatessen", "shoprite", "festival", "festval"] },

  // ✅ Buffet agora vai pra Fast Food (como você decidiu)
  {
    label: "Fast Food",
    keywords: [
      "fast food",
      "burger",
      "burgers",
      "hamburger",
      "hamburger_restaurant",
      "mcdonald",
      "burger king",
      "wendy",
      "in n out",
      "american (traditional)",
      "american (new)",
      "buffet",
      "buffets",
      "buffet_restaurant",
    ],
  },

  // fallback BR
  { label: "Brazilian", keywords: ["brazilian", "brazil", "brasil", "feijoada", "mineiro", "minas","baiano","baiana","cantinho"] },
];

const LOT_REGEX_RULES = LOT_RULES.map((rule) => ({
  label: rule.label,
  patterns: rule.keywords
    .map((k) => String(k).trim())
    .filter(Boolean)
    .map((keyword) => new RegExp(`\\b${escapeRegExp(norm(keyword))}\\b`, "i")),
}));

function normalizeToLot(value) {
  const normalized = norm(value);
  for (const rule of LOT_REGEX_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.label;
    }
  }
  return value;
}

function formatToken(token) {
  if (!token) return "";
  const t = token.trim();
  if (!t) return "";
  if (t === t.toUpperCase()) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

