import { normalizarTexto } from "./calcClient";
import {
  BitacoraRow,
  BudgetItem,
  ProjectConfig,
  RoomActivityItem,
  RoomActivityKey,
} from "./types";

export const CASA_MENDOZA_ROOM_ORDER: string[] = [
  "Habitación Mamá",
  "Habitación Esteban",
  "Habitación Nan & I",
  "Habitación Abuelos",
  "Habitación Lisbeth",
  "Habitación Huésped",
  "Sala",
  "Cocina",
  "Baño 1",
  "Entrada / Puerta 1",
  "Entrada / Puerta 2",
];

/**
 * Dataset exacto por habitación extraído de Revit 2027 — Casa Mendoza 1.1.rvt:
 * - Plantilla de concreto 7cm (11 zonas = 110 m²)
 * - Enchape piso porcelanato 51x51 (11 zonas = 111 m²)
 * - Cielo raso + Frescasa Eco 2-1/2" (9 zonas = 88 m²)
 */
export const CASA_MENDOZA_ROOMS_BASE: RoomActivityItem[] = [
  // Habitación Mamá (12 m²)
  { id: "cm-hmom-plantilla", room: "Habitación Mamá", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto H mom", unit: "m²", quantity: 12 },
  { id: "cm-hmom-enchape", room: "Habitación Mamá", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso H Mom", unit: "m²", quantity: 12 },
  { id: "cm-hmom-cielorraso", room: "Habitación Mamá", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso H Mom", unit: "m²", quantity: 12 },
  { id: "cm-hmom-frescasa", room: "Habitación Mamá", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco H Mom", unit: "m²", quantity: 12 },

  // Habitación Esteban (8 m²)
  { id: "cm-hesteban-plantilla", room: "Habitación Esteban", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto H Esteban", unit: "m²", quantity: 8 },
  { id: "cm-hesteban-enchape", room: "Habitación Esteban", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso H Esteban", unit: "m²", quantity: 8 },
  { id: "cm-hesteban-cielorraso", room: "Habitación Esteban", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso H Esteban", unit: "m²", quantity: 8 },
  { id: "cm-hesteban-frescasa", room: "Habitación Esteban", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco H Esteban", unit: "m²", quantity: 8 },

  // Habitación Nan & I (10 m²)
  { id: "cm-hnan-plantilla", room: "Habitación Nan & I", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto H Nan & I", unit: "m²", quantity: 10 },
  { id: "cm-hnan-enchape", room: "Habitación Nan & I", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso H Nan & I", unit: "m²", quantity: 10 },
  { id: "cm-hnan-cielorraso", room: "Habitación Nan & I", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso H Nan & I", unit: "m²", quantity: 10 },
  { id: "cm-hnan-frescasa", room: "Habitación Nan & I", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco H Nan & I", unit: "m²", quantity: 10 },

  // Habitación Abuelos (7 m²)
  { id: "cm-habuelos-plantilla", room: "Habitación Abuelos", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto H Abuelos", unit: "m²", quantity: 7 },
  { id: "cm-habuelos-enchape", room: "Habitación Abuelos", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso H Abuelos", unit: "m²", quantity: 7 },
  { id: "cm-habuelos-cielorraso", room: "Habitación Abuelos", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso H Abuelos", unit: "m²", quantity: 7 },
  { id: "cm-habuelos-frescasa", room: "Habitación Abuelos", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco H Abuelos", unit: "m²", quantity: 7 },

  // Habitación Lisbeth (10 m²)
  { id: "cm-hlisbeth-plantilla", room: "Habitación Lisbeth", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto H Lisbeth", unit: "m²", quantity: 10 },
  { id: "cm-hlisbeth-enchape", room: "Habitación Lisbeth", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso H Lisbeth", unit: "m²", quantity: 10 },
  { id: "cm-hlisbeth-cielorraso", room: "Habitación Lisbeth", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso H Lisbeth", unit: "m²", quantity: 10 },
  { id: "cm-hlisbeth-frescasa", room: "Habitación Lisbeth", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco H Lisbeth", unit: "m²", quantity: 10 },

  // Habitación Huésped (5 m²)
  { id: "cm-hhuesped-plantilla", room: "Habitación Huésped", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto H Huesped", unit: "m²", quantity: 5 },
  { id: "cm-hhuesped-enchape", room: "Habitación Huésped", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso Huesped", unit: "m²", quantity: 5 },
  { id: "cm-hhuesped-cielorraso", room: "Habitación Huésped", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso Huesped", unit: "m²", quantity: 5 },
  { id: "cm-hhuesped-frescasa", room: "Habitación Huésped", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco Huesped", unit: "m²", quantity: 5 },

  // Sala (19 m²)
  { id: "cm-sala-plantilla", room: "Sala", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto Sala", unit: "m²", quantity: 19 },
  { id: "cm-sala-enchape", room: "Sala", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso Sala", unit: "m²", quantity: 19 },
  { id: "cm-sala-cielorraso", room: "Sala", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso Sala", unit: "m²", quantity: 19 },
  { id: "cm-sala-frescasa", room: "Sala", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco Sala", unit: "m²", quantity: 19 },

  // Cocina (14 m²)
  { id: "cm-cocina-plantilla", room: "Cocina", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto Cocina", unit: "m²", quantity: 14 },
  { id: "cm-cocina-enchape", room: "Cocina", activityKey: "enchape", activityLabel: "Enchape piso porcelanato cocina 51x51", sourceComment: "Enchape piso Cocina", unit: "m²", quantity: 14 },
  { id: "cm-cocina-cielorraso", room: "Cocina", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso Cocina", unit: "m²", quantity: 14 },
  { id: "cm-cocina-frescasa", room: "Cocina", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco Cocina", unit: "m²", quantity: 14 },

  // Baño 1 (3 m²)
  { id: "cm-bano1-plantilla", room: "Baño 1", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto Baño 1", unit: "m²", quantity: 3 },
  { id: "cm-bano1-enchape", room: "Baño 1", activityKey: "enchape", activityLabel: "Enchape piso porcelanato baño 51x51", sourceComment: "Enchape piso Baño 1", unit: "m²", quantity: 3 },
  { id: "cm-bano1-cielorraso", room: "Baño 1", activityKey: "cielorraso", activityLabel: 'Cielo raso en Drywall 1/2"', sourceComment: "Cielo raso Baño 1", unit: "m²", quantity: 3 },
  { id: "cm-bano1-frescasa", room: "Baño 1", activityKey: "frescasa", activityLabel: 'Frescasa Eco 2-1/2" (sobre cielo raso)', sourceComment: "Frescasa Eco Baño 1", unit: "m²", quantity: 3 },

  // Entrada / Puerta 1 (13 m²)
  { id: "cm-puerta1-plantilla", room: "Entrada / Puerta 1", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto puerta 1", unit: "m²", quantity: 13 },
  { id: "cm-puerta1-enchape", room: "Entrada / Puerta 1", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso entrada 1", unit: "m²", quantity: 13 },

  // Entrada / Puerta 2 (9 m² plantilla / 10 m² enchape)
  { id: "cm-puerta2-plantilla", room: "Entrada / Puerta 2", activityKey: "plantilla", activityLabel: "Plantilla de concreto 7cm", sourceComment: "Plantilla de concreto puerta 2", unit: "m²", quantity: 9 },
  { id: "cm-puerta2-enchape", room: "Entrada / Puerta 2", activityKey: "enchape", activityLabel: "Enchape piso porcelanato 51x51", sourceComment: "Enchape piso entrada 2", unit: "m²", quantity: 10 },
];

export const RESIDENTIAL_PROTO_ROOM_ORDER: string[] = [
  "Sala",
  "Comedor",
  "Cocina",
  "Baño Social",
  "Hall Escalera",
  "Habitación Principal",
  "Habitación 1",
  "Habitación 2",
  "Habitación 3",
  "Habitación 4",
  "Habitación Huésped",
  "Baño 1",
  "Hall Nivel 2",
  "Balcón",
  "Entrada / Puerta 1",
  "Entrada / Puerta 2",
];

/**
 * Dataset prototipo desmenuzado por habitación basado en tablas de
 * planificación (Schedules) de Revit 2027 — Prototipo Residencial 1.1.rvt:
 * - Plantilla de concreto 7cm (11 zonas = 110 m²)
 * - Enchape piso porcelanato baño + zonas + cocina (11 zonas = 111 m²)
 * - Cielo raso (9 zonas = 88 m²)
 */
export const RESIDENTIAL_PROTO_ROOMS_BASE: RoomActivityItem[] = [
  // Habitación Principal
  {
    id: "pr-hprin-plantilla",
    room: "Habitación Principal",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Hab. Principal",
    unit: "m²",
    quantity: 12,
  },
  {
    id: "pr-hprin-enchape",
    room: "Habitación Principal",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso Hab. Principal",
    unit: "m²",
    quantity: 12,
  },
  {
    id: "pr-hprin-cielorraso",
    room: "Habitación Principal",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Hab. Principal",
    unit: "m²",
    quantity: 12,
  },
  {
    id: "pr-hprin-frescasa",
    room: "Habitación Principal",
    activityKey: "frescasa",
    activityLabel: "Aislamiento termoacústico 2-1/2\" (sobre cielo raso)",
    sourceComment: "Aislamiento Hab. Principal",
    unit: "m²",
    quantity: 12,
  },

  // Habitación 1
  {
    id: "pr-h1-plantilla",
    room: "Habitación 1",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Hab. 1",
    unit: "m²",
    quantity: 8,
  },
  {
    id: "pr-h1-enchape",
    room: "Habitación 1",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso Hab. 1",
    unit: "m²",
    quantity: 8,
  },
  {
    id: "pr-h1-cielorraso",
    room: "Habitación 1",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Hab. 1",
    unit: "m²",
    quantity: 8,
  },
  {
    id: "pr-h1-frescasa",
    room: "Habitación 1",
    activityKey: "frescasa",
    activityLabel: "Aislamiento termoacústico 2-1/2\" (sobre cielo raso)",
    sourceComment: "Aislamiento Hab. 1",
    unit: "m²",
    quantity: 8,
  },

  // Habitación 2
  {
    id: "pr-h2-plantilla",
    room: "Habitación 2",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Hab. 2",
    unit: "m²",
    quantity: 10,
  },
  {
    id: "pr-h2-enchape",
    room: "Habitación 2",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso Hab. 2",
    unit: "m²",
    quantity: 10,
  },
  {
    id: "pr-h2-cielorraso",
    room: "Habitación 2",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Hab. 2",
    unit: "m²",
    quantity: 10,
  },
  {
    id: "pr-h2-frescasa",
    room: "Habitación 2",
    activityKey: "frescasa",
    activityLabel: "Aislamiento termoacústico 2-1/2\" (sobre cielo raso)",
    sourceComment: "Aislamiento Hab. 2",
    unit: "m²",
    quantity: 10,
  },

  // Habitación 3
  {
    id: "pr-h3-plantilla",
    room: "Habitación 3",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Hab. 3",
    unit: "m²",
    quantity: 7,
  },
  {
    id: "pr-h3-enchape",
    room: "Habitación 3",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso Hab. 3",
    unit: "m²",
    quantity: 7,
  },
  {
    id: "pr-h3-cielorraso",
    room: "Habitación 3",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Hab. 3",
    unit: "m²",
    quantity: 7,
  },
  {
    id: "pr-h3-frescasa",
    room: "Habitación 3",
    activityKey: "frescasa",
    activityLabel: "Aislamiento termoacústico 2-1/2\" (sobre cielo raso)",
    sourceComment: "Aislamiento Hab. 3",
    unit: "m²",
    quantity: 7,
  },

  // Habitación 4
  {
    id: "pr-h4-plantilla",
    room: "Habitación 4",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Hab. 4",
    unit: "m²",
    quantity: 10,
  },
  {
    id: "pr-h4-enchape",
    room: "Habitación 4",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso Hab. 4",
    unit: "m²",
    quantity: 10,
  },
  {
    id: "pr-h4-cielorraso",
    room: "Habitación 4",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Hab. 4",
    unit: "m²",
    quantity: 10,
  },
  {
    id: "pr-h4-frescasa",
    room: "Habitación 4",
    activityKey: "frescasa",
    activityLabel: "Aislamiento termoacústico 2-1/2\" (sobre cielo raso)",
    sourceComment: "Aislamiento Hab. 4",
    unit: "m²",
    quantity: 10,
  },

  // Habitación Huésped
  {
    id: "cm-hhuesped-plantilla",
    room: "Habitación Huésped",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto H Huesped",
    unit: "m²",
    quantity: 5,
  },
  {
    id: "cm-hhuesped-enchape",
    room: "Habitación Huésped",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso Huesped",
    unit: "m²",
    quantity: 5,
  },
  {
    id: "cm-hhuesped-cielorraso",
    room: "Habitación Huésped",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Huesped",
    unit: "m²",
    quantity: 5,
  },
  {
    id: "cm-hhuesped-frescasa",
    room: "Habitación Huésped",
    activityKey: "frescasa",
    activityLabel: "Frescasa Eco 2-1/2\" (sobre cielo raso)",
    sourceComment: "Frescasa Eco Huesped",
    unit: "m²",
    quantity: 5,
  },

  // Sala
  {
    id: "cm-sala-plantilla",
    room: "Sala",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Sala",
    unit: "m²",
    quantity: 19,
  },
  {
    id: "cm-sala-enchape",
    room: "Sala",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso Sala",
    unit: "m²",
    quantity: 19,
  },
  {
    id: "cm-sala-cielorraso",
    room: "Sala",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Sala",
    unit: "m²",
    quantity: 19,
  },
  {
    id: "cm-sala-frescasa",
    room: "Sala",
    activityKey: "frescasa",
    activityLabel: "Frescasa Eco 2-1/2\" (sobre cielo raso)",
    sourceComment: "Frescasa Eco Sala",
    unit: "m²",
    quantity: 19,
  },

  // Cocina
  {
    id: "cm-cocina-plantilla",
    room: "Cocina",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Cocina",
    unit: "m²",
    quantity: 14,
  },
  {
    id: "cm-cocina-enchape",
    room: "Cocina",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato cocina 51x51",
    sourceComment: "Enchape piso Cocina",
    unit: "m²",
    quantity: 14,
  },
  {
    id: "cm-cocina-cielorraso",
    room: "Cocina",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Cocina",
    unit: "m²",
    quantity: 14,
  },
  {
    id: "cm-cocina-frescasa",
    room: "Cocina",
    activityKey: "frescasa",
    activityLabel: "Frescasa Eco 2-1/2\" (sobre cielo raso)",
    sourceComment: "Frescasa Eco Cocina",
    unit: "m²",
    quantity: 14,
  },

  // Baño 1
  {
    id: "cm-bano1-plantilla",
    room: "Baño 1",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto Baño 1",
    unit: "m²",
    quantity: 3,
  },
  {
    id: "cm-bano1-enchape",
    room: "Baño 1",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato baño 51x51",
    sourceComment: "Enchape piso Baño 1",
    unit: "m²",
    quantity: 3,
  },
  {
    id: "cm-bano1-cielorraso",
    room: "Baño 1",
    activityKey: "cielorraso",
    activityLabel: "Cielo raso",
    sourceComment: "Cielo raso Baño 1",
    unit: "m²",
    quantity: 3,
  },
  {
    id: "cm-bano1-frescasa",
    room: "Baño 1",
    activityKey: "frescasa",
    activityLabel: "Frescasa Eco 2-1/2\" (sobre cielo raso)",
    sourceComment: "Frescasa Eco Baño 1",
    unit: "m²",
    quantity: 3,
  },

  // Entrada / Puerta 1
  {
    id: "cm-puerta1-plantilla",
    room: "Entrada / Puerta 1",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto puerta 1",
    unit: "m²",
    quantity: 13,
  },
  {
    id: "cm-puerta1-enchape",
    room: "Entrada / Puerta 1",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso entrada 1",
    unit: "m²",
    quantity: 13,
  },

  // Entrada / Puerta 2
  {
    id: "cm-puerta2-plantilla",
    room: "Entrada / Puerta 2",
    activityKey: "plantilla",
    activityLabel: "Plantilla de concreto 7cm",
    sourceComment: "Plantilla de concreto puerta 2",
    unit: "m²",
    quantity: 9,
  },
  {
    id: "cm-puerta2-enchape",
    room: "Entrada / Puerta 2",
    activityKey: "enchape",
    activityLabel: "Enchape piso porcelanato 51x51",
    sourceComment: "Enchape piso entrada 2",
    unit: "m²",
    quantity: 10,
  },
];

const DEFAULT_ACTIVITY_PRICES: Record<RoomActivityKey, number> = {
  plantilla: 34000,
  enchape: 58000,
  enchape_pared: 58000,
  cielorraso: 38000,
  frescasa: 17500,
  mamposteria: 47500,
  panete: 24000,
  pintura: 16500,
  carpinteria: 390000,
  cubierta: 45000,
  otro: 0,
};

const ACTIVITY_MATCH_HINTS: Record<RoomActivityKey, string[]> = {
  plantilla: ["plantilla", "solado", "base de piso"],
  enchape: ["porcelanato", "enchape", "ceramica", "piso"],
  enchape_pared: [
    "enchape de pared",
    "enchape pared",
    "enchape muro",
    "ceramica pared",
    "azulejo",
    "salpicadero",
    "backsplash",
    "pared bano",
    "pared cocina",
  ],
  cielorraso: ["cielo", "cielorraso", "ceiling"],
  frescasa: ["frescasa", "aislamiento", "aislante", "fibra de vidrio", "termoacustico"],
  mamposteria: ["mamposteria", "bloque", "bloques"],
  panete: ["panete", "revoco"],
  pintura: ["estuco", "pintura", "vinilica"],
  carpinteria: ["puerta", "ventana", "carpinteria"],
  cubierta: ["cubierta", "upvc", "pag", "correas", "eternit", "teja"],
  otro: [],
};

export function resolveUnitPriceForRoomItem(
  item: RoomActivityItem,
  pptoBase: BudgetItem[],
  priceOverrides?: Partial<Record<RoomActivityKey, number>>
): number {
  if (typeof item.unitPrice === "number" && item.unitPrice > 0) {
    return item.unitPrice;
  }
  const override = priceOverrides?.[item.activityKey];
  if (typeof override === "number" && override > 0) {
    return override;
  }
  const hints = ACTIVITY_MATCH_HINTS[item.activityKey] || [];
  for (const b of pptoBase || []) {
    const actNorm = normalizarTexto(b.Actividad);
    if (hints.some((h) => actNorm.includes(h))) {
      return Number(b.Precio_Unitario) || 0;
    }
  }
  return DEFAULT_ACTIVITY_PRICES[item.activityKey] ?? 0;
}

export function normalizeRevitRoomName(rawSuffix: string): string {
  const n = normalizarTexto(rawSuffix).replace(/\s+/g, " ");
  if (!n) return "General / Sin Habitación";
  if (n.includes("mom") || n.includes("mama")) return "Habitación Mamá";
  if (n.includes("esteban")) return "Habitación Esteban";
  if (n.includes("nan")) return "Habitación Nan & I";
  if (n.includes("abuelo")) return "Habitación Abuelos";
  if (n.includes("lisbeth")) return "Habitación Lisbeth";
  if (n.includes("principal") || n.includes("master")) return "Habitación Principal";
  if (n.includes("hab 1") || n.includes("habitacion 1")) return "Habitación 1";
  if (n.includes("hab 2") || n.includes("habitacion 2")) return "Habitación 2";
  if (n.includes("hab 3") || n.includes("habitacion 3")) return "Habitación 3";
  if (n.includes("hab 4") || n.includes("habitacion 4")) return "Habitación 4";
  if (n.includes("huesped")) return "Habitación Huésped";
  if (n.includes("sala")) return "Sala";
  if (n.includes("comedor")) return "Comedor";
  if (n.includes("cocina")) return "Cocina";
  if (n.includes("bano social") || n.includes("powder")) return "Baño Social";
  if (n.includes("bano 1") || n === "bano") return "Baño 1";
  if (n.includes("hall escalera") || n.includes("stair hall")) return "Hall Escalera";
  if (n.includes("hall nivel 2") || n.includes("upper hall")) return "Hall Nivel 2";
  if (n.includes("balcon") || n.includes("balcony")) return "Balcón";
  if (n.includes("puerta 1") || n.includes("entrada 1")) return "Entrada / Puerta 1";
  if (n.includes("puerta 2") || n.includes("entrada 2")) return "Entrada / Puerta 2";

  return rawSuffix
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function classifyRevitActivityAndRoom(
  rawComment: string,
  rawFamilyType = ""
): {
  activityKey: RoomActivityKey;
  activityLabel: string;
  room: string;
} {
  const cNorm = normalizarTexto(rawComment);
  const fNorm = normalizarTexto(rawFamilyType);
  const combined = `${fNorm} ${cNorm}`;

  const isWallTile =
    ["pared", "muro", "azulejo", "salpicadero", "backsplash", "wall", "ceramica"].some((w) =>
      combined.includes(w)
    ) &&
    ["enchape", "ceramica", "porcelanato", "azulejo", "revestimiento", "salpicadero", "tile"].some(
      (t) => combined.includes(t)
    ) &&
    !cNorm.includes("piso");

  let activityKey: RoomActivityKey = "otro";
  let activityLabel = rawFamilyType.trim() || "Actividad BIM Revit";

  if (combined.includes("plantilla") || combined.includes("solado")) {
    activityKey = "plantilla";
    activityLabel = "Plantilla de concreto 7cm";
  } else if (isWallTile) {
    activityKey = "enchape_pared";
    activityLabel = "Enchape pared cerámica / porcelanato";
  } else if (
    combined.includes("enchape") ||
    combined.includes("porcelanato") ||
    combined.includes("piso ")
  ) {
    activityKey = "enchape";
    activityLabel = combined.includes("bano")
      ? "Enchape piso porcelanato baño 51x51"
      : "Enchape piso porcelanato 51x51";
  } else if (
    combined.includes("frescasa") ||
    combined.includes("aislamiento") ||
    combined.includes("aislante") ||
    combined.includes("fibra de vidrio") ||
    combined.includes("termoacustico")
  ) {
    activityKey = "frescasa";
    activityLabel = 'Frescasa Eco 2-1/2" (sobre cielo raso)';
  } else if (
    combined.includes("cielo raso") ||
    combined.includes("cielorraso") ||
    combined.includes("ceiling")
  ) {
    activityKey = "cielorraso";
    activityLabel = "Cielo raso";
  } else if (
    combined.includes("mamposteria") ||
    combined.includes("bloque") ||
    combined.includes("muro")
  ) {
    activityKey = "mamposteria";
    activityLabel = "Muros mampostería bloque No. 12";
  } else if (combined.includes("panete") || combined.includes("revoco")) {
    activityKey = "panete";
    activityLabel = "Pañete y mortero de revoco";
  } else if (combined.includes("estuco") || combined.includes("pintura")) {
    activityKey = "pintura";
    activityLabel = "Estuco y pintura vinílica";
  } else if (
    combined.includes("cubierta") ||
    combined.includes("pendiente") ||
    combined.includes("impermeab") ||
    combined.includes("alfaj") ||
    combined.includes("bajante")
  ) {
    activityKey = "cubierta";
    activityLabel = 'Losa cubierta RC, pendiente 1%, alfajía & bajante 4"';
  } else if (combined.includes("ventana") || combined.includes("puerta")) {
    activityKey = "carpinteria";
    activityLabel = combined.includes("ventana") ? "Ventanería aluminio y vidrio" : "Puertas interiores y acceso";
  }

  // Remueve el prefijo de actividad del Comment de Revit para aislar la habitación
  const stripped = rawComment
    .replace(
      /^\s*(plantilla\s+de\s+concreto(\s+7\s*cm)?|frescasa(\s+eco)?(\s+2[- ]1\/2["”]?|\s+sobre\s+cielo\s*raso)?|aislamiento(\s+termoac[uú]stico)?|enchape\s+de\s+pared|enchape\s+pared|enchape\s+de\s+muro|enchape\s+muro|ceramica\s+pared|azulejo|enchape\s+piso|enchape|cielo\s*raso|mamposteria\s+bloque|muros?|panete|pintura)\s*/i,
      ""
    )
    .trim();

  const room = normalizeRevitRoomName(stripped || rawComment);
  return { activityKey, activityLabel, room };
}

export function slugRoomActivityId(room: string, activityKey: RoomActivityKey): string {
  const rSlug = normalizarTexto(room).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${rSlug || "zona"}-${activityKey}`;
}

export function parseNumericArea(rawVal: string): number {
  const cleaned = String(rawVal || "")
    .replace(/m²|m2|und|ml|m3|m³/gi, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return NaN;
  const normalized = cleaned.includes(",") && !cleaned.includes(".")
    ? cleaned.replace(",", ".")
    : cleaned.replace(/,/g, "");
  return Number(normalized);
}

/**
 * Respaldo local en TypeScript para parsear tablas exportadas desde Revit (.txt tabulado o .csv),
 * replicando la estructura nativa <TITULO> -> Cabeceras -> Filas detalle -> Totales.
 */
export function parseRevitScheduleLocal(text: string): {
  items: RoomActivityItem[];
  error?: string;
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  let headerIdx = -1;
  let sep = "\t";
  let idxComment = -1;
  let idxArea = -1;
  let idxFamily = -1;

  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    if (line.trim().startsWith("<") && line.trim().endsWith(">")) continue;
    const candidateSep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const cols = line.split(candidateSep).map((c) => normalizarTexto(c.replace(/^"|"$/g, "")));
    const cIdx = cols.findIndex((c) =>
      ["comments", "comentarios", "hubicacion", "ubicacion", "habitacion", "zona", "frente"].some((k) =>
        c.includes(k)
      )
    );
    const aIdx = cols.findIndex((c) =>
      ["area", "cantidad", "metrado", "count", "cant"].some((k) => c.includes(k))
    );
    if (cIdx !== -1 && aIdx !== -1) {
      headerIdx = i;
      sep = candidateSep;
      idxComment = cIdx;
      idxArea = aIdx;
      idxFamily = cols.findIndex((c) =>
        [
          "family and type",
          "familia y tipo",
          "floor assembly",
          "material: name",
          "material: descripcion",
          "type",
          "tipo",
          "actividad",
        ].some((k) => c.includes(k))
      );
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      items: [],
      error: "No se reconocieron las columnas de Revit (ej. Comments/Hubicación y Área). Exporta con File -> Export -> Reports -> Schedule.",
    };
  }

  const aggMap = new Map<string, RoomActivityItem>();
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const comment = (cols[idxComment] || "").trim();
    const areaVal = parseNumericArea(cols[idxArea] || "");

    const cNorm = normalizarTexto(comment);
    if (
      !comment ||
      Number.isNaN(areaVal) ||
      areaVal <= 0 ||
      cNorm.startsWith("grand total") ||
      cNorm.startsWith("total ") ||
      /:\s*\d+$/.test(comment)
    ) {
      continue;
    }

    const familyType = idxFamily >= 0 ? cols[idxFamily] || "" : "";
    const parsed = classifyRevitActivityAndRoom(comment, familyType);
    const id = slugRoomActivityId(parsed.room, parsed.activityKey);
    const prev = aggMap.get(id);
    if (prev) {
      prev.quantity = Number((prev.quantity + areaVal).toFixed(2));
    } else {
      aggMap.set(id, {
        id,
        room: parsed.room,
        activityKey: parsed.activityKey,
        activityLabel: parsed.activityLabel,
        sourceComment: comment,
        unit: parsed.activityKey === "carpinteria" ? "und" : "m²",
        quantity: Number(areaVal.toFixed(2)),
      });
    }
  }

  const items = Array.from(aggMap.values());
  if (items.length === 0) {
    return { items: [], error: "La tabla no contiene filas válidas con áreas mayores a 0." };
  }
  return { items };
}

/**
 * Cruza los registros de Bitácora en Supabase contra habitaciones específicas
 * cuando contienen el nombre de la habitación (ej. `[Habitación Principal]` o `[Sala]`).
 */
export function computeExecutedByRoomItem(
  roomItems: RoomActivityItem[],
  obraActiva: BitacoraRow[]
): Record<string, number> {
  const executed: Record<string, number> = {};
  for (const item of roomItems) executed[item.id] = 0;

  for (const row of obraActiva || []) {
    const actRaw = String(row.actividad || "");
    const actNorm = normalizarTexto(actRaw);
    if (!actNorm || actNorm.includes("bim_takeoff") || actNorm.includes("takeoff")) continue;

    const cant = Number(row.cantidad || 0) || 0;
    if (cant <= 0) continue;

    for (const item of roomItems) {
      const roomNorm = normalizarTexto(item.room);
      const roomTokens = roomNorm
        .replace(/habitacion\s+/g, "")
        .replace(/entrada\s*\/\s*/g, "")
        .trim();

      const matchesRoom =
        actNorm.includes(`[${roomNorm}]`) ||
        actNorm.includes(roomNorm) ||
        (roomTokens.length >= 4 && actNorm.includes(roomTokens)) ||
        (item.room === "Habitación Principal" && (actNorm.includes("principal") || actNorm.includes("master"))) ||
        (item.room === "Entrada / Puerta 1" && (actNorm.includes("puerta 1") || actNorm.includes("entrada 1"))) ||
        (item.room === "Entrada / Puerta 2" && (actNorm.includes("puerta 2") || actNorm.includes("entrada 2")));

      if (!matchesRoom) continue;

      if (
        item.activityKey === "enchape" &&
        (actNorm.includes("pared") || actNorm.includes("muro") || actNorm.includes("azulejo") || actNorm.includes("salpicadero"))
      ) {
        continue;
      }
      if (
        item.activityKey === "cielorraso" &&
        (actNorm.includes("frescasa") || actNorm.includes("aislamiento") || actNorm.includes("aislante") || actNorm.includes("fibra de vidrio"))
      ) {
        continue;
      }
      if (item.activityKey === "mamposteria" && actNorm.includes("enchape")) {
        continue;
      }

      const hints = ACTIVITY_MATCH_HINTS[item.activityKey] || [];
      if (hints.some((h) => actNorm.includes(h))) {
        executed[item.id] = Number(((executed[item.id] || 0) + cant).toFixed(2));
        break;
      }
    }
  }

  return executed;
}

export interface RoomMaterialSummary {
  insumo: string;
  unidad: string;
  cantidad: number;
  cantidadCompra: number;
  precioUnitRef: number;
  categoria: string;
}

function roundPurchaseQty(qty: number, unidad: string): number {
  if (qty <= 0) return 0;
  const u = unidad.toLowerCase();
  // Unidades indivisibles de ferretería: redondeo comercial al entero superior
  if (
    u.includes("lámina") ||
    u.includes("lamina") ||
    u.includes("rollo") ||
    u.includes("saco") ||
    u.includes("bulto") ||
    u.includes("cuñete") ||
    u.includes("cunete") ||
    u.includes("gal") ||
    u === "und"
  ) {
    return Math.ceil(qty);
  }
  if (u === "kg") return Math.ceil(qty);
  if (u === "m²" || u === "ml") return Number((Math.ceil(qty * 2) / 2).toFixed(2));
  if (u === "m³") return Number((Math.ceil(qty * 20) / 20).toFixed(2));
  return Number(qty.toFixed(2));
}

export function computeMaterialsForRoomSelection(
  selectedItems: RoomActivityItem[]
): RoomMaterialSummary[] {
  const map = new Map<string, RoomMaterialSummary>();
  const add = (
    insumo: string,
    unidad: string,
    qty: number,
    precioUnitRef: number,
    categoria: string
  ) => {
    if (qty <= 0) return;
    const key = `${insumo}||${unidad}`;
    const prev = map.get(key) || {
      insumo,
      unidad,
      cantidad: 0,
      cantidadCompra: 0,
      precioUnitRef,
      categoria,
    };
    prev.cantidad += qty;
    map.set(key, prev);
  };

  for (const item of selectedItems) {
    const q = Number(item.quantity || 0);
    if (q <= 0) continue;
    switch (item.activityKey) {
      case "plantilla":
        add("Cemento Gris Tipo UG para Plantilla e=7cm (Sacos 50 kg)", "Sacos", q * 0.45, 32000, "Obra Gris / Plantilla");
        add("Arena Lavada de Río para Plantilla (0.07 m³/m²)", "m³", q * 0.042, 85000, "Obra Gris / Plantilla");
        add('Gravilla / Triturado 3/4" para Plantilla', "m³", q * 0.056, 95000, "Obra Gris / Plantilla");
        break;
      case "enchape":
        add("Porcelanato / Cerámica 51×51 cm (inc. 5% desp.)", "m²", q * 1.05, 34000, "Pisos y Enchapes");
        add("Pegacor Cerámico / Porcelanato (Bultos 25 kg)", "Bultos", q * 0.25, 28000, "Pisos y Enchapes");
        add("Boquilla para Junta de Piso", "kg", q * 0.35, 7500, "Pisos y Enchapes");
        break;
      case "enchape_pared":
        add("Cerámica / Porcelanato de Pared (inc. 8% desp. cortes)", "m²", q * 1.08, 36000, "Pisos y Enchapes");
        add("Pegacor Blanco / Cerámico Pared (Bultos 25 kg)", "Bultos", q * 0.25, 31000, "Pisos y Enchapes");
        add("Boquilla Antimoho para Muro", "kg", q * 0.35, 8500, "Pisos y Enchapes");
        break;
      case "cielorraso":
        add('Lámina de Drywall 1/2" Standard (1.22×2.44 m = 2.98 m², inc. 5% desp.)', "Láminas", (q * 1.05) / 2.9768, 34500, "Cielo Raso Drywall");
        add("Perfilería Metálica Drywall (Ángulo Perimetral y Perfil Omega)", "ml", q * 1.8, 4500, "Cielo Raso Drywall");
        add('Tornillo para Drywall 6×1" Punta Fina (fijación lámina a perfil)', "Und", q * 15, 45, "Cielo Raso Drywall");
        add('Tornillo de Estructura 7×7/16" Cabeza Lenteja (perfil a perfil)', "Und", q * 8, 55, "Cielo Raso Drywall");
        add("Tiros de Fijación (Fulminante Cal. .22 + Clavo c/ Arandela)", "Und", q * 4, 450, "Cielo Raso Drywall");
        add("Masilla Lista para Drywall (Juntas y Acabado)", "kg", q * 0.9, 4200, "Cielo Raso Drywall");
        add("Cinta de Papel / Malla para Juntas Drywall", "ml", q * 1.5, 450, "Cielo Raso Drywall");
        break;
      case "frescasa":
        add('Rollo Frescasa Eco 2-1/2" (7.62×1.22 m = 9.30 m², inc. 5% desp.)', "Rollos", (q * 1.05) / 9.2964, 112900, "Aislamiento Térmico");
        break;
      case "mamposteria":
        add("Bloque de Concreto No. 12 (40×20×12 cm)", "Und", q * 12.5, 2400, "Mampostería y Pañete");
        add("Cemento Gris para Pega (Sacos 50 kg)", "Sacos", q * 12.5 * 0.015, 32000, "Mampostería y Pañete");
        add("Arena Fina para Mortero de Pega", "m³", q * 12.5 * 0.002, 85000, "Mampostería y Pañete");
        break;
      case "panete":
        add("Cemento Gris para Pañete (Sacos 50 kg)", "Sacos", q * 0.22, 32000, "Mampostería y Pañete");
        add("Arena Lavada para Pañete", "m³", q * 0.028, 85000, "Mampostería y Pañete");
        break;
      case "pintura":
        add("Estuco Plástico Listo (Cuñetes)", "Cuñetes", q * 0.08, 78000, "Pintura y Acabados");
        add("Pintura Vinilo Tipo 1 (Galones)", "Gal", q * 0.12, 62000, "Pintura y Acabados");
        break;
      case "cubierta":
        add("Concreto Premezclado f'c=24 MPa (Losa L-2 e=12cm)", "m³", q * 0.12, 460000, "Cubierta");
        add("Mortero Afine Impermeabilizado Pendiente 1% (1:3)", "m³", q * 0.055, 340000, "Cubierta");
        add("Membrana Elastomérica Impermeabilizante Cubierta", "m²", q * 1.1, 28000, "Cubierta");
        break;
      default:
        break;
    }
  }

  const catOrder = [
    "Obra Gris / Plantilla",
    "Pisos y Enchapes",
    "Cielo Raso Drywall",
    "Aislamiento Térmico",
    "Mampostería y Pañete",
    "Pintura y Acabados",
    "Cubierta",
  ];

  return Array.from(map.values())
    .map((m) => {
      const cantidad = Number(m.cantidad.toFixed(2));
      return {
        ...m,
        cantidad,
        cantidadCompra: roundPurchaseQty(cantidad, m.unidad),
      };
    })
    .sort((a, b) => {
      const ca = catOrder.indexOf(a.categoria);
      const cb = catOrder.indexOf(b.categoria);
      if (ca !== cb) return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
      return b.cantidadCompra * b.precioUnitRef - a.cantidadCompra * a.precioUnitRef;
    });
}

export function getInitialRoomItemsForProject(proyecto: ProjectConfig): RoomActivityItem[] {
  if (proyecto.zonas_bim && proyecto.zonas_bim.length > 0) {
    return proyecto.zonas_bim;
  }
  if (proyecto.id === "casa_mendoza") {
    return CASA_MENDOZA_ROOMS_BASE.map((item) => ({ ...item }));
  }
  if (proyecto.id === "proto_residencial") {
    return RESIDENTIAL_PROTO_ROOMS_BASE.map((item) => ({ ...item }));
  }
  return [];
}
