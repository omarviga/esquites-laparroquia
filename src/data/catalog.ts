export type ModifierOption = { id: string; label: string; priceDelta?: number };
export type ModifierGroup = {
  id: string;
  label: string;
  required: boolean;
  multi?: boolean;
  options: ModifierOption[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  category: CategoryId;
  description?: string;
  includes?: string[];
  emoji: string;
  modifiers?: ModifierGroup[];
};

export type CategoryId =
  | "fritura"
  | "elote"
  | "maruchan"
  | "chicharron"
  | "preparados"
  | "lokos"
  | "uchepos";

export const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
  { id: "fritura", label: "Fritura", emoji: "🌽" },
  { id: "elote", label: "Elote", emoji: "🌽" },
  { id: "maruchan", label: "Maruchan", emoji: "🍜" },
  { id: "chicharron", label: "Chicharrón", emoji: "🥓" },
  { id: "preparados", label: "Preparados", emoji: "🥣" },
  { id: "lokos", label: "Lokos", emoji: "🔥" },
  { id: "uchepos", label: "Uchepos", emoji: "🫔" },
];

const friturasOptions: ModifierGroup = {
  id: "tipo-fritura",
  label: "Seleccione una fritura",
  required: true,
  options: [
    { id: "tostitos", label: "Tostitos" },
    { id: "takis", label: "Takis" },
    { id: "cheetos", label: "Cheetos" },
    { id: "doritos", label: "Doritos" },
    { id: "ruffles", label: "Ruffles" },
    { id: "churros", label: "Churros" },
  ],
};

const tipoElote: ModifierGroup = {
  id: "tipo-elote",
  label: "Seleccione tipo de elote",
  required: true,
  options: [
    { id: "blanco", label: "Elote Blanco" },
    { id: "amarillo", label: "Elote Amarillo" },
  ],
};

export const PRODUCTS: Product[] = [
  // FRITURA
  { id: "f1", category: "fritura", name: "Churros con crema y queso", price: 40, emoji: "🥨" },
  { id: "f2", category: "fritura", name: "Frituras solas", price: 25, emoji: "🍟", modifiers: [friturasOptions] },
  { id: "f3", category: "fritura", name: "Fritura con verdura", price: 20, emoji: "🥗", description: "Repollo, jitomate, cueritos", modifiers: [friturasOptions] },
  { id: "f4", category: "fritura", name: "Preparados con Frituras", price: 35, emoji: "🌶️", modifiers: [friturasOptions] },
  { id: "f5", category: "fritura", name: "Preparados con Cacahuate japonés", price: 40, emoji: "🥜" },
  { id: "f6", category: "fritura", name: "Preparados con Papas doradas", price: 40, emoji: "🥔" },

  // ELOTE
  { id: "e1", category: "elote", name: "Entero", price: 25, emoji: "🌽", modifiers: [tipoElote] },
  { id: "e2", category: "elote", name: "Entero con aderezos", price: 40, emoji: "🌽", modifiers: [tipoElote] },
  { id: "e3", category: "elote", name: "Vaso chico", price: 35, emoji: "🥤", modifiers: [tipoElote] },
  { id: "e4", category: "elote", name: "Cazuelita", price: 40, emoji: "🍲", modifiers: [tipoElote] },
  { id: "e5", category: "elote", name: "Vaso mediano", price: 45, emoji: "🥤", modifiers: [tipoElote] },
  { id: "e6", category: "elote", name: "Vaso grande", price: 50, emoji: "🥛", modifiers: [tipoElote] },

  // MARUCHAN
  { id: "m1", category: "maruchan", name: "Maruchan con limón y salsa", price: 30, emoji: "🍜" },
  { id: "m2", category: "maruchan", name: "Maruchan con aderezos", price: 50, emoji: "🍜" },
  { id: "m3", category: "maruchan", name: "Maruchan con elote", price: 65, emoji: "🍜" },

  // CHICHARRÓN
  { id: "c1", category: "chicharron", name: "Chicharrón preparado", price: 40, emoji: "🥓", description: "Jitomate, repollo, cueritos, sal, limón y salsa al gusto." },

  // PREPARADOS
  ...["Dorilocos", "Tostilocos", "Churrolocos", "Chicharrolotes", "Takilotes", "Cheetolotes"].map((n, i) => ({
    id: `p${i + 1}`, category: "preparados" as const, name: n, price: 65, emoji: "🥣",
    includes: ["Elote", "Crema o mayonesa", "Queso", "Cacahuate japonés", "Salsa", "Limón"],
  })),

  // LOKOS
  ...["Dorilokos", "Tostilokos", "Cheetolokos", "Takilokos", "Churrolokos", "Rufflelokos", "Papas Lokas", "Chicharrón Loko"].map((n, i) => ({
    id: `l${i + 1}`, category: "lokos" as const, name: n, price: 65, emoji: "🔥",
    includes: ["Jitomate", "Repollo", "Pepino", "Jícama", "Cueritos", "Cacahuate japonés", "Gomitas", "Clamato", "Salsa inglesa", "Jugo Maggi"],
  })),

  // UCHEPOS
  { id: "u1", category: "uchepos", name: "Uchepo sencillo", price: 16, emoji: "🫔" },
  { id: "u2", category: "uchepos", name: "Uchepos preparados (3 pz)", price: 40, emoji: "🫔", description: "Crema, queso, salsa" },
  { id: "u3", category: "uchepos", name: "Uchepos con elote", price: 65, emoji: "🫔", description: "3 uchepos preparados + elote" },
];
