import * as THREE from "three";
import { PORTICO_2N_SPEC } from "./takeoff";

export type MepDiscipline = "HVAC" | "PLU" | "ELEC";
export type BimDiscipline = "STR" | "ARQ" | MepDiscipline;
export type ClashSeverity = "critical" | "major" | "minor";
export type ClashWorkflowStatus = "active" | "review" | "resolved";

export interface MepBoxPart {
  kind: "box";
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

export interface MepPipePart {
  kind: "pipe";
  p0: [number, number, number];
  p1: [number, number, number];
  radius: number;
}

export type MepPartGeom = MepBoxPart | MepPipePart;

export interface MepElementDef {
  id: string;
  discipline: MepDiscipline;
  subSystem:
    | "hvac_duct"
    | "hvac_equip"
    | "potable_water"
    | "sanitary"
    | "rainwater"
    | "electrical_tray"
    | "electrical_panel";
  nameEs: string;
  nameEn: string;
  levelEs: string;
  levelEn: string;
  specEs: string;
  specEn: string;
  color: number;
  /** Default Pre-BIM geometry parts (may collide with STR or other MEP) */
  parts: MepPartGeom[];
  /** Clash ID that triggers rerouting this element when resolved */
  clashRuleId?: string;
  /** Coordinated BIM geometry parts applied when clashRuleId is resolved */
  resolvedParts?: MepPartGeom[];
}

export interface StructuralTargetBox {
  id: string;
  discipline: "STR";
  nameEs: string;
  nameEn: string;
  levelEs: string;
  levelEn: string;
  gridRef: string;
  box: THREE.Box3;
}

export interface ClashRuleMeta {
  id: string;
  testSet: "STR vs. MEP" | "MEP vs. MEP";
  disciplineA: BimDiscipline;
  disciplineB: BimDiscipline;
  elementAId: string;
  elementBId: string;
  severity: ClashSeverity;
  levelEs: string;
  levelEn: string;
  gridRef: string;
  titleEs: string;
  titleEn: string;
  causeEs: string;
  causeEn: string;
  solutionEs: string;
  solutionEn: string;
  normRef: string;
  reworkSavingsCop: number;
}

export interface DetectedClash {
  id: string;
  testSet: "STR vs. MEP" | "MEP vs. MEP";
  disciplineA: BimDiscipline;
  disciplineB: BimDiscipline;
  elementAId: string;
  elementANameEs: string;
  elementANameEn: string;
  elementBId: string;
  elementBNameEs: string;
  elementBNameEn: string;
  severity: ClashSeverity;
  levelEs: string;
  levelEn: string;
  gridRef: string;
  titleEs: string;
  titleEn: string;
  causeEs: string;
  causeEn: string;
  solutionEs: string;
  solutionEn: string;
  normRef: string;
  reworkSavingsCop: number;
  /** Computed live from Three.js Box3 intersection */
  currentlyColliding: boolean;
  /** Exact penetration depth in millimeters (0 when resolved) */
  penetrationMm: number;
  /** 3D intersection centroid (x, y, z) in meters */
  point: [number, number, number];
  /** Intersection bounding box size in meters */
  overlapSize: [number, number, number];
  /** Workflow status */
  status: ClashWorkflowStatus;
  /** Imported from external Navisworks XML? */
  importedFromXml?: boolean;
}

export interface ImportedNavisworksClash {
  id: string;
  testName: string;
  name: string;
  status: string;
  distanceMm: number;
  gridLocation: string;
  point: [number, number, number];
  itemA: string;
  itemB: string;
}

export const DISCIPLINE_COLORS: Record<BimDiscipline, string> = {
  STR: "#64748b",
  ARQ: "#94a3b8",
  HVAC: "#06b6d4",
  PLU: "#2563eb",
  ELEC: "#ef4444",
};

/**
 * Helper to compute the exact Three.js world-space AABB for a single MEP geometry part.
 */
export function computePartBox3(part: MepPartGeom): THREE.Box3 {
  if (part.kind === "box") {
    return new THREE.Box3(
      new THREE.Vector3(part.x - part.w / 2, part.y - part.h / 2, part.z - part.d / 2),
      new THREE.Vector3(part.x + part.w / 2, part.y + part.h / 2, part.z + part.d / 2)
    );
  }
  const [x0, y0, z0] = part.p0;
  const [x1, y1, z1] = part.p1;
  const r = part.radius;
  return new THREE.Box3(
    new THREE.Vector3(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.min(z0, z1) - r),
    new THREE.Vector3(Math.max(x0, x1) + r, Math.max(y0, y1) + r, Math.max(z0, z1) + r)
  );
}

/**
 * Builds Three.js BufferGeometry for a single MEP part (box or oriented pipe cylinder).
 */
export function buildMepPartGeometry(part: MepPartGeom): THREE.BufferGeometry {
  if (part.kind === "box") {
    const g = new THREE.BoxGeometry(part.w, part.h, part.d);
    g.translate(part.x, part.y, part.z);
    return g;
  }
  const v0 = new THREE.Vector3(...part.p0);
  const v1 = new THREE.Vector3(...part.p1);
  const dir = new THREE.Vector3().subVectors(v1, v0);
  const len = Math.max(0.02, dir.length());
  const mid = new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5);

  const g = new THREE.CylinderGeometry(part.radius, part.radius, len, 14);
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
  const mat = new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(mat);
  return g;
}

/**
 * Extracts exact structural collision targets (columns, VE beams, VCU beams, parapets)
 * directly from the shared PORTICO-2N parametric JSON specification.
 */
export function getPortico2nStructuralTargets(): StructuralTargetBox[] {
  const s = PORTICO_2N_SPEC;
  const targets: StructuralTargetBox[] = [];

  for (const col of s.columns.items) {
    const half = s.columns.b / 2;
    targets.push({
      id: col.id,
      discipline: "STR",
      nameEs: `Columna Estructural ${col.id} (30×30 cm)`,
      nameEn: `Structural Column ${col.id} (12"×12")`,
      levelEs: "Niveles 1–2",
      levelEn: "Levels 1–2",
      gridRef: `Eje ${col.gx}-${col.gz}`,
      box: new THREE.Box3(
        new THREE.Vector3(col.x - half, s.levels.gradeBeamTop, col.z - half),
        new THREE.Vector3(col.x + half, col.top, col.z + half)
      ),
    });
  }

  for (const bm of s.beams) {
    if (bm.type === "VC") continue; // Grade beams below slab
    const spec = s.beamTypes[bm.type as keyof typeof s.beamTypes];
    const isX = bm.axis === "x";
    const x0 = isX ? Math.min(bm.from, bm.to) : bm.line - spec.b / 2;
    const x1 = isX ? Math.max(bm.from, bm.to) : bm.line + spec.b / 2;
    const z0 = isX ? bm.line - spec.b / 2 : Math.min(bm.from, bm.to);
    const z1 = isX ? bm.line + spec.b / 2 : Math.max(bm.from, bm.to);
    const y0 = bm.top - spec.h;
    const y1 = bm.top;

    targets.push({
      id: bm.id,
      discipline: "STR",
      nameEs:
        bm.type === "VE"
          ? `Viga Aérea Entrepiso ${bm.id} (30×40 cm)`
          : `Viga Cubierta ${bm.id} (25×30 cm)`,
      nameEn:
        bm.type === "VE"
          ? `Elevated Floor Beam ${bm.id} (30×40 cm)`
          : `Roof Tie-Beam ${bm.id} (25×30 cm)`,
      levelEs: bm.type === "VE" ? "Nivel 2 (+3.00 m)" : "Cubierta (+5.80 m)",
      levelEn: bm.type === "VE" ? "Level 2 (+3.00 m)" : "Roof (+5.80 m)",
      gridRef: `Eje ${bm.gridLine}`,
      box: new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)),
    });
  }

  for (const par of s.parapets) {
    const isX = Math.abs(par.x2 - par.x1) >= Math.abs(par.z2 - par.z1);
    const halfT = par.thickness / 2;
    const x0 = isX ? Math.min(par.x1, par.x2) : par.x1 - halfT;
    const x1 = isX ? Math.max(par.x1, par.x2) : par.x1 + halfT;
    const z0 = isX ? par.z1 - halfT : Math.min(par.z1, par.z2);
    const z1 = isX ? par.z1 + halfT : Math.max(par.z1, par.z2);
    targets.push({
      id: par.id,
      discipline: "STR",
      nameEs: `Antepecho Cubierta ${par.id} (Bloque N°12)`,
      nameEn: `Roof Parapet ${par.id} (CMU No. 12)`,
      levelEs: "Cubierta (+5.80 m)",
      levelEn: "Roof (+5.80 m)",
      gridRef: par.id,
      box: new THREE.Box3(
        new THREE.Vector3(x0, s.levels.roofDeck, z0),
        new THREE.Vector3(x1, s.levels.parapetTop, z1)
      ),
    });
  }

  return targets;
}

/**
 * Full 3D MEP Network for PORTICO-2N (HVAC + Plumbing/Rainwater + Electrical).
 * Coordinates are mathematically aligned to rooms (Cocina, Baño Social, Baño N2,
 * Sala, Comedor, Habitaciones, Cubierta L-2) and structural grid axes 1-2-3 / A-B-C.
 */
export const PORTICO_2N_MEP_ELEMENTS: MepElementDef[] = [
  // =========================================================================
  // 1. HVAC / MECHANICAL (M) — CYAN / GALVANIZED STEEL
  // =========================================================================
  {
    id: "HVAC-COND",
    discipline: "HVAC",
    subSystem: "hvac_equip",
    nameEs: "Unidad Condensadora HVAC Cubierta (3 TR Inverter)",
    nameEn: "Rooftop HVAC Condensing Unit (3-Ton Inverter)",
    levelEs: "Cubierta (+5.88 m)",
    levelEn: "Roof (+5.88 m)",
    specEs: "Base concreto 10 cm + amortiguadores neopreno",
    specEn: "4\" concrete housekeeping pad + vibration isolators",
    color: 0x0891b2,
    parts: [
      { kind: "box", x: -1.9, y: 6.26, z: -2.05, w: 0.96, h: 0.68, d: 0.52 },
      // Vertical supply plenum dropping cleanly through L-2 opening into N2 plenum
      { kind: "box", x: -1.9, y: 5.72, z: -2.05, w: 0.32, h: 0.56, d: 0.26 },
    ],
  },
  {
    id: "HVAC-N2-MAIN",
    discipline: "HVAC",
    subSystem: "hvac_duct",
    nameEs: "Ducto Principal HVAC Nivel 2 (32×12 cm)",
    nameEn: "Level 2 Main HVAC Supply Trunk (32×12 cm)",
    levelEs: "Nivel 2 (Plenum +5.42 m)",
    levelEn: "Level 2 (Plenum +5.42 m)",
    specEs: "Lámina galvanizada cal. 24 + aislamiento térmico",
    specEn: "24-ga galvanized sheet metal + thermal liner",
    color: 0x06b6d4,
    parts: [
      { kind: "box", x: -1.9, y: 5.42, z: 0.05, w: 0.32, h: 0.12, d: 4.35 },
      // Vertical riser shaft connecting N2 plenum down to N1 HVAC trunk (inside Cocina wall zone)
      { kind: "box", x: -1.9, y: 4.08, z: -1.65, w: 0.28, h: 2.68, d: 0.22 },
    ],
  },
  {
    id: "HVAC-N2-BR",
    discipline: "HVAC",
    subSystem: "hvac_duct",
    nameEs: "Ramal HVAC Habitación 2 (Nivel 2 • 28×18 cm)",
    nameEn: "Bedroom 2 HVAC Branch Duct (Level 2 • 28×18 cm)",
    levelEs: "Nivel 2 (Plenum)",
    levelEn: "Level 2 (Plenum)",
    specEs: "Ducto rectangular alimentación Zona Este N2",
    specEn: "Rectangular supply branch to East Zone L2",
    color: 0x22d3ee,
    clashRuleId: "CLH-002",
    // PRE-BIM: runs at y = 5.58 (y in [5.49, 5.67]), colliding directly with roof beam VCU-2 (y: 5.50..5.80)
    parts: [{ kind: "box", x: 0.15, y: 5.58, z: 1.75, w: 4.1, h: 0.18, d: 0.28 }],
    // COORDINATED: flat low-profile transition 36x10 cm tucked cleanly at y = 5.42 (30mm below VCU-2)
    resolvedParts: [{ kind: "box", x: 0.15, y: 5.42, z: 1.75, w: 4.1, h: 0.1, d: 0.36 }],
  },
  {
    id: "HVAC-N1-MAIN",
    discipline: "HVAC",
    subSystem: "hvac_duct",
    nameEs: "Ducto Principal HVAC Nivel 1 (32×20 cm)",
    nameEn: "Level 1 Main HVAC Supply Trunk (32×20 cm)",
    levelEs: "Nivel 1 (+2.74 m)",
    levelEn: "Level 1 (+2.74 m)",
    specEs: "Alimentación Cocina → Sala (Eje 1–2)",
    specEn: "Kitchen → Living Room supply trunk (Grid 1–2)",
    color: 0x06b6d4,
    clashRuleId: "CLH-001",
    // PRE-BIM: straight through beam VE-B (z in [-0.15, +0.15], y in [2.60, 3.00]) at y = 2.74
    parts: [{ kind: "box", x: -1.9, y: 2.74, z: 0.25, w: 0.32, h: 0.2, d: 3.7 }],
    // COORDINATED: 5-segment realistic soffit drop passing 80 mm clear underneath beam VE-B
    resolvedParts: [
      { kind: "box", x: -1.9, y: 2.74, z: -0.975, w: 0.32, h: 0.2, d: 1.25 }, // z: -1.60 -> -0.35
      { kind: "box", x: -1.9, y: 2.58, z: -0.35, w: 0.32, h: 0.42, d: 0.2 }, // vertical drop
      { kind: "box", x: -1.9, y: 2.42, z: 0.0, w: 0.32, h: 0.2, d: 0.88 }, // pass under VE-B (y: 2.32..2.52 < 2.60)
      { kind: "box", x: -1.9, y: 2.58, z: 0.35, w: 0.32, h: 0.42, d: 0.2 }, // vertical rise
      { kind: "box", x: -1.9, y: 2.74, z: 1.225, w: 0.32, h: 0.2, d: 1.75 }, // z: +0.35 -> +2.10
    ],
  },
  {
    id: "HVAC-N1-BR",
    discipline: "HVAC",
    subSystem: "hvac_duct",
    nameEs: "Ramal HVAC Sala–Comedor N1 (26×16 cm)",
    nameEn: "Living–Dining HVAC Branch L1 (26×16 cm)",
    levelEs: "Nivel 1 (+2.46 m)",
    levelEn: "Level 1 (+2.46 m)",
    specEs: "Cruce bajo viga VE-2 hacia difusores Comedor",
    specEn: "Branch under beam VE-2 serving Dining diffusers",
    color: 0x22d3ee,
    // Passes cleanly under VE-2 (y: 2.38..2.54 < 2.60)
    parts: [
      { kind: "box", x: -1.9, y: 2.6, z: 1.8, w: 0.26, h: 0.36, d: 0.24 }, // drop connector from HVAC-N1-MAIN
      { kind: "box", x: 0.15, y: 2.46, z: 1.8, w: 4.1, h: 0.16, d: 0.26 },
    ],
  },

  // =========================================================================
  // 2. PLUMBING & RAINWATER (P) — POTABLE BLUE / SANITARY AMBER / RAIN YELLOW
  // =========================================================================
  {
    id: "AF-TANK",
    discipline: "PLU",
    subSystem: "potable_water",
    nameEs: "Tanque Reserva Agua Potable 1,000 L (Cubierta)",
    nameEn: "1,000 L Potable Water Reserve Tank (Roof)",
    levelEs: "Cubierta (+5.90 m)",
    levelEn: "Roof (+5.90 m)",
    specEs: "Polietileno tricapa + flotador + válvula cheque",
    specEn: "Triple-layer HDPE tank + float & check valve",
    color: 0x1d4ed8,
    parts: [
      { kind: "pipe", p0: [-3.1, 5.9, -2.55], p1: [-3.1, 6.82, -2.55], radius: 0.48 },
    ],
  },
  {
    id: "AF-MONT-1",
    discipline: "PLU",
    subSystem: "potable_water",
    nameEs: 'Montante Agua Potable Fría Ø 1½" (Núcleo Húmedo)',
    nameEn: '1½" Cold Potable Water Riser (Wet Core)',
    levelEs: "Niveles 1–2",
    levelEn: "Levels 1–2",
    specEs: "PVC Presión RDE 21 NTC 382 • Alimenta Cocina y Baños",
    specEn: "Schedule 40 Pressure PVC • Serves Kitchen & Baths",
    color: 0x2563eb,
    parts: [
      // Incoming service line from front West street meter under N1 slab
      { kind: "pipe", p0: [-2.2, 0.12, 3.3], p1: [-2.2, 0.12, -3.15], radius: 0.036 },
      // Vertical potable riser inside rear wet chase (Cocina N1 / Baño 1 N2)
      { kind: "pipe", p0: [-2.2, 0.12, -3.15], p1: [-2.2, 4.9, -3.15], radius: 0.042 },
      // Branch N1 to Baño Social & Cocina
      { kind: "pipe", p0: [-3.2, 1.15, -3.15], p1: [-1.1, 1.15, -3.15], radius: 0.028 },
      // Branch N2 to Baño 1 fixtures
      { kind: "pipe", p0: [-2.2, 3.9, -3.15], p1: [-0.85, 3.9, -3.15], radius: 0.028 },
    ],
  },
  {
    id: "AF-ROOF-1",
    discipline: "PLU",
    subSystem: "potable_water",
    nameEs: 'Línea Impulsión Tanque Cubierta Ø 1½" (AF-ROOF-1)',
    nameEn: '1½" Roof Tank Supply Riser (AF-ROOF-1)',
    levelEs: "Nivel 2 → Cubierta",
    levelEn: "Level 2 → Roof",
    specEs: "PVC Presión RDE 21 • Sube a tanque reserva cubierta",
    specEn: "Pressure PVC supply riser feeding rooftop tank",
    color: 0x3b82f6,
    clashRuleId: "CLH-006",
    // PRE-BIM: climbs inside corner column C1 (x in [-4.15,-3.85], z in [-3.65,-3.35])!
    parts: [
      { kind: "pipe", p0: [-2.2, 4.9, -3.15], p1: [-3.92, 4.9, -3.42], radius: 0.038 },
      { kind: "pipe", p0: [-3.92, 4.9, -3.42], p1: [-3.92, 6.42, -3.42], radius: 0.042 },
      { kind: "pipe", p0: [-3.92, 6.42, -3.42], p1: [-3.1, 6.42, -2.55], radius: 0.038 },
    ],
    // COORDINATED: routes cleanly via interior wet chase at (-3.52, -3.05), 280mm clear of Column C1 & Parapet
    resolvedParts: [
      { kind: "pipe", p0: [-2.2, 4.9, -3.15], p1: [-3.52, 4.9, -3.05], radius: 0.038 },
      { kind: "pipe", p0: [-3.52, 4.9, -3.05], p1: [-3.52, 6.42, -3.05], radius: 0.042 },
      { kind: "pipe", p0: [-3.52, 6.42, -3.05], p1: [-3.1, 6.42, -2.55], radius: 0.038 },
    ],
  },
  {
    id: "SAN-BAJ-1",
    discipline: "PLU",
    subSystem: "sanitary",
    nameEs: 'Bajante Aguas Negras SAN-1 (PVC Sanitaria Ø 4")',
    nameEn: '4" Sanitary Soil Stack SAN-1 (PVC ASTM D2665)',
    levelEs: "Niveles 0–2",
    levelEn: "Levels 0–2",
    specEs: "Ducto vertical sanitario + colector enterrado bajo VC",
    specEn: "Vertical sanitary soil stack + sub-grade collector",
    color: 0xd97706,
    parts: [
      // Vertical 4" soil stack at NW wet chase (clear of C1 and walls)
      { kind: "pipe", p0: [-3.2, -0.62, -3.18], p1: [-3.2, 3.15, -3.18], radius: 0.055 },
      // Sub-grade horizontal collector cleanly below grade beams (VC bottom = -0.45)
      { kind: "pipe", p0: [-3.2, -0.62, -3.18], p1: [-3.2, -0.68, 3.85], radius: 0.055 },
    ],
  },
  {
    id: "SAN-COL-N2",
    discipline: "PLU",
    subSystem: "sanitary",
    nameEs: 'Colector Sanitario Baño Nivel 2 (PVC Ø 4")',
    nameEn: 'Level 2 Bathroom 4" Sanitary Collector',
    levelEs: "Nivel 2 (Bajo Losa L-1)",
    levelEn: "Level 2 (Below Slab L-1)",
    specEs: "Pendiente 2% • Descarga aparato sanitario y ducha N2",
    specEn: "2% slope • Bathroom 1 WC & shower branch collector",
    color: 0xf59e0b,
    clashRuleId: "CLH-003",
    // PRE-BIM: attempts to cross East across beam VE-2 (x in [-0.15, 0.15], y in [2.60, 3.00]) at y = 2.78!
    parts: [
      { kind: "pipe", p0: [-1.25, 2.8, -2.2], p1: [0.55, 2.74, -2.2], radius: 0.055 },
    ],
    // COORDINATED: rerouted West inside Baño N2 ceiling directly into vertical stack SAN-BAJ-1 (no beam crossing!)
    resolvedParts: [
      { kind: "pipe", p0: [-1.25, 2.78, -2.2], p1: [-3.2, 2.72, -2.2], radius: 0.055 },
      { kind: "pipe", p0: [-3.2, 2.72, -2.2], p1: [-3.2, 2.69, -3.18], radius: 0.055 },
    ],
  },
  {
    id: "PLUV-BLL-1",
    discipline: "PLU",
    subSystem: "rainwater",
    nameEs: 'Bajante Pluvial Cubierta BLL-1 (PVC Sanitaria Ø 4")',
    nameEn: 'Roof Rainwater Downspout BLL-1 (4" Sanitary PVC)',
    levelEs: "Cubierta → Nivel 1 (Eje 3-A)",
    levelEn: "Roof → Level 1 (Grid 3-A)",
    specEs: "Conectado a losa L-2 pendiente 1% + tragante cúpula",
    specEn: "Connected to 1% sloped L-2 roof slab + dome strainer",
    color: 0xeab308,
    parts: [
      { kind: "pipe", p0: [3.72, 5.82, -3.22], p1: [4.23, 5.82, -3.22], radius: 0.055 },
      { kind: "pipe", p0: [4.23, 5.82, -3.22], p1: [4.23, 0.18, -3.22], radius: 0.055 },
    ],
  },

  // =========================================================================
  // 3. ELECTRICAL & DATA (E) — RED / COPPER-ORANGE
  // =========================================================================
  {
    id: "ELEC-PANELS",
    discipline: "ELEC",
    subSystem: "electrical_panel",
    nameEs: "Tablero General TG-N1, Subtablero ST-N2 y Montante EMT",
    nameEn: "Main Breaker Panel TG-N1, Subpanel ST-N2 & EMT Riser",
    levelEs: "Niveles 1–2 (Eje 2-B)",
    levelEn: "Levels 1–2 (Grid 2-B)",
    specEs: "RETIE • 24 circuitos bifásicos + barraje cobre + tubería EMT 2\"",
    specEn: "NEC/RETIE • 24-circuit panelboard + 2\" EMT feeder riser",
    color: 0xb91c1c,
    parts: [
      { kind: "box", x: 0.65, y: 1.45, z: -0.26, w: 0.42, h: 0.58, d: 0.14 }, // TG-N1
      { kind: "box", x: 0.65, y: 4.35, z: -0.26, w: 0.36, h: 0.48, d: 0.14 }, // ST-N2
      { kind: "pipe", p0: [0.65, 1.74, -0.26], p1: [0.65, 4.11, -0.26], radius: 0.032 }, // vertical EMT riser
    ],
  },
  {
    id: "ELEC-TR-N1",
    discipline: "ELEC",
    subSystem: "electrical_tray",
    nameEs: "Bandeja Portacables Iluminación/Tomas N1 (18×8 cm)",
    nameEn: "Level 1 Lighting & Power Cable Tray (18×8 cm)",
    levelEs: "Nivel 1 (+2.46 m)",
    levelEn: "Level 1 (+2.46 m)",
    specEs: "Bandeja tipo malla electrozincada + soportes varilla roscada",
    specEn: "Wire-mesh cable tray + threaded-rod trapeze hangers",
    color: 0xef4444,
    clashRuleId: "CLH-004",
    // PRE-BIM: runs straight at y = 2.46 across HVAC-N1-BR (z = 1.80, y: 2.38..2.54) -> MEP-vs-MEP clash!
    parts: [
      { kind: "box", x: 0.65, y: 2.46, z: 1.32, w: 0.18, h: 0.08, d: 3.16 }, // z: -0.26 -> +2.90
    ],
    // COORDINATED: drops cleanly under HVAC-N1-BR on trapeze at y = 2.26 (80 mm vertical separation)
    resolvedParts: [
      { kind: "box", x: 0.65, y: 2.46, z: 0.54, w: 0.18, h: 0.08, d: 1.6 }, // z: -0.26 -> +1.34
      { kind: "box", x: 0.65, y: 2.36, z: 1.34, w: 0.18, h: 0.24, d: 0.08 }, // drop down
      { kind: "box", x: 0.65, y: 2.26, z: 1.8, w: 0.18, h: 0.08, d: 0.96 }, // under HVAC-N1-BR (y: 2.22..2.30 < 2.38)
      { kind: "box", x: 0.65, y: 2.36, z: 2.26, w: 0.18, h: 0.24, d: 0.08 }, // rise back
      { kind: "box", x: 0.65, y: 2.46, z: 2.58, w: 0.18, h: 0.08, d: 0.64 }, // z: +2.26 -> +2.90
    ],
  },
  {
    id: "ELEC-ALIM-N2",
    discipline: "ELEC",
    subSystem: "electrical_tray",
    nameEs: "Alimentador Eléctrico Zona Húmeda / Hab. 3 (Nivel 2)",
    nameEn: "Level 2 Wet-Zone / Bedroom 3 Electrical Feeder",
    levelEs: "Nivel 2 (+3.65 m)",
    levelEn: "Level 2 (+3.65 m)",
    specEs: "Ductería EMT 1½\" + circuitos GFCI Baño N2 y Hab. 3",
    specEn: "1½\" EMT feeder tray serving Bath 1 GFCI & Bedroom 3",
    color: 0xf97316,
    clashRuleId: "CLH-005",
    // PRE-BIM: runs along z = -3.15 directly through potable water riser AF-MONT-1 (-2.20, -3.15)! (RETIE violation)
    parts: [
      { kind: "box", x: 0.65, y: 3.65, z: -1.705, w: 0.14, h: 0.07, d: 2.89 }, // from ST-N2 z=-0.26 -> -3.15
      { kind: "box", x: -1.35, y: 3.65, z: -3.15, w: 4.0, h: 0.07, d: 0.14 }, // x: +0.65 -> -3.35 hits AF-MONT-1!
    ],
    // COORDINATED: rerouted 45 cm South along z = -2.70 maintaining RETIE minimum clearance from water riser
    resolvedParts: [
      { kind: "box", x: 0.65, y: 3.65, z: -1.48, w: 0.14, h: 0.07, d: 2.44 }, // z: -0.26 -> -2.70
      { kind: "box", x: -1.35, y: 3.65, z: -2.7, w: 4.0, h: 0.07, d: 0.14 }, // clear of AF-MONT-1 at z=-3.15
    ],
  },
];

/**
 * Curated Navisworks-style Clash Detective Rule Definitions for PORTICO-2N.
 * Geometry intersection, penetration depth (mm) and 3D coordinates are computed dynamically
 * using real THREE.Box3 intersection math against the active (Pre-BIM vs Coordinated) meshes.
 */
export const PORTICO_2N_CLASH_RULES: ClashRuleMeta[] = [
  {
    id: "CLH-001",
    testSet: "STR vs. MEP",
    disciplineA: "STR",
    disciplineB: "HVAC",
    elementAId: "VE-B",
    elementBId: "HVAC-N1-MAIN",
    severity: "critical",
    levelEs: "Nivel 1 (+2.74 m)",
    levelEn: "Level 1 (+2.74 m)",
    gridRef: "Eje B / 1–2",
    titleEs: "Ducto HVAC Principal N1 atraviesa Viga Aérea VE-B",
    titleEn: "Level 1 Main HVAC Trunk pierces Floor Beam VE-B",
    causeEs:
      "El ducto rectangular de 32×20 cm cruza el alma de concreto y los estribos de la viga estructural VE-B (30×40 cm) sin cambio de cota.",
    causeEn:
      "32×20 cm rectangular supply duct penetrates the concrete web and stirrups of structural floor beam VE-B (30×40 cm).",
    solutionEs:
      "Descolgar el ducto 32 cm con transición en bayoneta para pasar 80 mm libre por debajo del fondo de viga VE-B (+2.60 m).",
    solutionEn:
      "Apply 32 cm soffit offset drop to route duct 80 mm clear underneath beam VE-B soffit (+2.60 m).",
    normRef: "NSR-10 C.6.3 / ACI 318 (Prohibición de pases no diseñados en vigas sísmicas)",
    reworkSavingsCop: 4_850_000,
  },
  {
    id: "CLH-002",
    testSet: "STR vs. MEP",
    disciplineA: "STR",
    disciplineB: "HVAC",
    elementAId: "VCU-2",
    elementBId: "HVAC-N2-BR",
    severity: "critical",
    levelEs: "Nivel 2 (+5.58 m)",
    levelEn: "Level 2 (+5.58 m)",
    gridRef: "Eje 2 / B–C",
    titleEs: "Ramal HVAC Habitación 2 impacta Viga Cubierta VCU-2",
    titleEn: "Bedroom 2 HVAC Branch collides with Roof Beam VCU-2",
    causeEs:
      "El ramal de suministro hacia Habitación 2 se trazó a +5.58 m intersectando el tercio inferior de la viga de cubierta VCU-2 (25×30 cm).",
    causeEn:
      "Supply branch toward Bedroom 2 was routed at +5.58 m intersecting the lower third of roof beam VCU-2 (25×30 cm).",
    solutionEs:
      "Reconfigurar sección a ducto plano equivalente 36×10 cm (misma área hidráulica) a cota +5.42 m en plenum de drywall.",
    solutionEn:
      "Convert to equivalent flat low-profile 36×10 cm duct routed at +5.42 m inside drywall ceiling plenum.",
    normRef: "ASHRAE Duct Sizing / NSR-10 C.6.3",
    reworkSavingsCop: 3_400_000,
  },
  {
    id: "CLH-003",
    testSet: "STR vs. MEP",
    disciplineA: "STR",
    disciplineB: "PLU",
    elementAId: "VE-2",
    elementBId: "SAN-COL-N2",
    severity: "critical",
    levelEs: "Nivel 2 (+2.78 m)",
    levelEn: "Level 2 (+2.78 m)",
    gridRef: "Eje 2 / A–B",
    titleEs: 'Colector Sanitario Ø 4" perfora Viga Estructural VE-2',
    titleEn: '4" Sanitary Collector pierces Structural Beam VE-2',
    causeEs:
      "La descarga sanitaria de Baño 1 Nivel 2 se proyectó hacia el Este cruzando directamente la viga pórtico VE-2 en zona de momento negativo.",
    causeEn:
      "Level 2 Bathroom sanitary collector was routed East directly across primary frame beam VE-2.",
    solutionEs:
      "Invertir pendiente (2%) hacia el Oeste conectando directamente al bajante vertical SAN-1 en el ducto húmedo sin cruzar vigas.",
    solutionEn:
      "Reverse 2% gravity slope West into vertical soil stack SAN-1 inside wet chase with zero beam crossings.",
    normRef: "NTC 1500 (Fontanería) / NSR-10 C.6.3",
    reworkSavingsCop: 2_950_000,
  },
  {
    id: "CLH-006",
    testSet: "STR vs. MEP",
    disciplineA: "STR",
    disciplineB: "PLU",
    elementAId: "C1",
    elementBId: "AF-ROOF-1",
    severity: "critical",
    levelEs: "Nivel 2 → Cubierta (+5.30 m)",
    levelEn: "Level 2 → Roof (+5.30 m)",
    gridRef: "Eje 1-A",
    titleEs: 'Impulsión Agua Potable Ø 1½" embebida en Columna C1',
    titleEn: '1½" Potable Water Riser embedded inside Column C1',
    causeEs:
      "La tubería de subida al tanque de reserva en cubierta invade el núcleo confinado de la columna esquinera C1 (30×30 cm).",
    causeEn:
      "Roof reserve tank supply riser intrudes into the confined core of corner structural column C1 (30×30 cm).",
    solutionEs:
      "Desplazar montante 40 cm hacia el ducto técnico interior (-3.52, -3.05) con pase coordinado en losa L-2, respetando NSR-10.",
    solutionEn:
      "Offset riser 40 cm into dedicated interior MEP chase (-3.52, -3.05) with coordinated sleeve in slab L-2.",
    normRef: "NSR-10 C.6.3.4 (Prohibición de tuberías embebidas en columnas)",
    reworkSavingsCop: 1_450_000,
  },
  {
    id: "CLH-004",
    testSet: "MEP vs. MEP",
    disciplineA: "HVAC",
    disciplineB: "ELEC",
    elementAId: "HVAC-N1-BR",
    elementBId: "ELEC-TR-N1",
    severity: "major",
    levelEs: "Nivel 1 (+2.46 m)",
    levelEn: "Level 1 (+2.46 m)",
    gridRef: "Eje 2–3 / B–C",
    titleEs: "Bandeja Portacables N1 colisiona con Ramal HVAC Comedor",
    titleEn: "Level 1 Cable Tray collides with Dining HVAC Branch",
    causeEs:
      "Ambas instalaciones comparten exactamente la misma elevación (+2.46 m) en el cielo raso de Sala-Comedor generando bloqueo físico en obra.",
    causeEn:
      "Electrical cable tray and HVAC supply branch occupy the exact same elevation (+2.46 m) in Living-Dining ceiling.",
    solutionEs:
      "Instalar paso inferior tipo trapecio Unistrut en la bandeja eléctrica a cota +2.26 m dejando 80 mm libres bajo el ducto HVAC.",
    solutionEn:
      "Add Unistrut drop trapeze offset on cable tray at +2.26 m providing 80 mm clear separation under HVAC duct.",
    normRef: "RETIE Art. 20 / Coordinación MEP ISO 19650",
    reworkSavingsCop: 1_650_000,
  },
  {
    id: "CLH-005",
    testSet: "MEP vs. MEP",
    disciplineA: "PLU",
    disciplineB: "ELEC",
    elementAId: "AF-MONT-1",
    elementBId: "ELEC-ALIM-N2",
    severity: "major",
    levelEs: "Nivel 2 (+3.65 m)",
    levelEn: "Level 2 (+3.65 m)",
    gridRef: "Eje 1–2 / A",
    titleEs: "Alimentador Eléctrico N2 cruza Montante Agua Potable (RETIE)",
    titleEn: "Level 2 Electrical Feeder intersects Potable Water Riser (NEC/RETIE)",
    causeEs:
      "La canalización eléctrica de Nivel 2 intersecta la tubería vertical de agua fría AF-MONT-1 violando separación mínima de seguridad eléctrica.",
    causeEn:
      "Level 2 electrical feeder tray intersects vertical cold-water riser AF-MONT-1 violating wet-zone electrical clearance.",
    solutionEs:
      "Desplazar corredor eléctrico 45 cm al Sur (z = -2.70 m) garantizando separación reglamentaria RETIE respecto a tubería hidráulica.",
    solutionEn:
      "Shift electrical corridor 45 cm South (z = -2.70 m) maintaining code-compliant clearance from potable water riser.",
    normRef: "RETIE / NTC 2050 (Separación redes eléctricas e hidráulicas)",
    reworkSavingsCop: 1_900_000,
  },
];

/**
 * Returns active parts for an MEP element considering which clashes have been resolved.
 */
export function getActiveMepParts(
  el: MepElementDef,
  resolvedRuleIds: Set<string>
): MepPartGeom[] {
  if (el.clashRuleId && el.resolvedParts && resolvedRuleIds.has(el.clashRuleId)) {
    return el.resolvedParts;
  }
  return el.parts;
}

/**
 * Computes exact AABB overlap between two sets of Box3 with an optional tolerance (meters).
 * Positive tolerance checks clearance violations (Navisworks Clearance Test); 0 = Hard Clash.
 */
function intersectBoxArrays(
  boxesA: THREE.Box3[],
  boxesB: THREE.Box3[],
  toleranceM: number
): {
  collides: boolean;
  penetrationMm: number;
  point: [number, number, number];
  size: [number, number, number];
} {
  let bestPenMm = 0;
  let bestPoint: [number, number, number] = [0, 0, 0];
  let bestSize: [number, number, number] = [0, 0, 0];
  let collides = false;

  for (const a of boxesA) {
    const expA = toleranceM > 0 ? a.clone().expandByScalar(toleranceM) : a;
    for (const b of boxesB) {
      if (!expA.intersectsBox(b)) continue;
      const inter = expA.clone().intersect(b);
      if (inter.isEmpty()) continue;
      const sz = new THREE.Vector3();
      const ctr = new THREE.Vector3();
      inter.getSize(sz);
      inter.getCenter(ctr);

      // Minimum overlap axis represents real penetration depth in Navisworks
      const minAxisM = Math.min(sz.x, sz.y, sz.z);
      if (minAxisM <= 0.0005) continue;
      const penMm = Math.round(minAxisM * 1000);
      if (penMm > bestPenMm) {
        collides = true;
        bestPenMm = penMm;
        bestPoint = [
          Number(ctr.x.toFixed(3)),
          Number(ctr.y.toFixed(3)),
          Number(ctr.z.toFixed(3)),
        ];
        bestSize = [
          Number(sz.x.toFixed(3)),
          Number(sz.y.toFixed(3)),
          Number(sz.z.toFixed(3)),
        ];
      }
    }
  }

  return { collides, penetrationMm: bestPenMm, point: bestPoint, size: bestSize };
}

/**
 * Executes real-time 3D Clash Detection across PORTICO-2N structural targets & MEP elements.
 */
export function runMepClashDetection(opts: {
  resolvedRuleIds: Set<string>;
  reviewRuleIds: Set<string>;
  toleranceMm: number;
}): DetectedClash[] {
  const { resolvedRuleIds, reviewRuleIds, toleranceMm } = opts;
  const tolM = Math.max(0, toleranceMm) / 1000;

  const strTargets = getPortico2nStructuralTargets();
  const strMap = new Map<string, StructuralTargetBox>();
  for (const t of strTargets) strMap.set(t.id, t);

  const mepMap = new Map<string, MepElementDef>();
  const mepBoxesMap = new Map<string, THREE.Box3[]>();
  const mepPreBoxesMap = new Map<string, THREE.Box3[]>();

  for (const el of PORTICO_2N_MEP_ELEMENTS) {
    mepMap.set(el.id, el);
    mepBoxesMap.set(
      el.id,
      getActiveMepParts(el, resolvedRuleIds).map(computePartBox3)
    );
    mepPreBoxesMap.set(el.id, el.parts.map(computePartBox3));
  }

  const results: DetectedClash[] = [];

  for (const rule of PORTICO_2N_CLASH_RULES) {
    const strA = strMap.get(rule.elementAId);
    const mepA = mepMap.get(rule.elementAId);
    const mepB = mepMap.get(rule.elementBId);
    if (!mepB || (!strA && !mepA)) continue;

    const boxesA = strA ? [strA.box] : mepBoxesMap.get(rule.elementAId) || [];
    const boxesB = mepBoxesMap.get(rule.elementBId) || [];

    // Compute live geometric intersection on current state
    const live = intersectBoxArrays(boxesA, boxesB, tolM);

    // Also compute original Pre-BIM centroid so user can still fly camera to resolved clash spot!
    const preBoxesA = strA ? [strA.box] : mepPreBoxesMap.get(rule.elementAId) || [];
    const preBoxesB = mepPreBoxesMap.get(rule.elementBId) || [];
    const baseline = intersectBoxArrays(preBoxesA, preBoxesB, 0);

    const status: ClashWorkflowStatus = !live.collides
      ? "resolved"
      : reviewRuleIds.has(rule.id)
      ? "review"
      : "active";

    results.push({
      ...rule,
      elementANameEs: strA ? strA.nameEs : mepA!.nameEs,
      elementANameEn: strA ? strA.nameEn : mepA!.nameEn,
      elementBNameEs: mepB.nameEs,
      elementBNameEn: mepB.nameEn,
      currentlyColliding: live.collides,
      penetrationMm: live.collides ? live.penetrationMm : 0,
      point: live.collides ? live.point : baseline.point,
      overlapSize: live.collides ? live.size : baseline.size,
      status,
    });
  }

  return results;
}

/**
 * Exports Clash Matrix to an Autodesk Navisworks Clash Detective compatible XML report (.xml).
 */
export function buildNavisworksXmlReport(
  projectName: string,
  clashes: DetectedClash[],
  toleranceMm: number
): string {
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const nowIso = new Date().toISOString();
  const activeCount = clashes.filter((c) => c.status === "active").length;
  const reviewCount = clashes.filter((c) => c.status === "review").length;
  const resolvedCount = clashes.filter((c) => c.status === "resolved").length;

  const resultXml = clashes
    .map((c) => {
      const nwStatus =
        c.status === "resolved" ? "resolved" : c.status === "review" ? "reviewed" : "active";
      return `        <clashresult name="${esc(c.id)} - ${esc(c.titleEs)}" guid="jgm-p2n-${esc(
        c.id.toLowerCase()
      )}" status="${nwStatus}" distance="-${(c.penetrationMm / 1000).toFixed(3)}">
          <description>${esc(c.causeEs)} | Solucion: ${esc(c.solutionEs)}</description>
          <gridlocation>${esc(c.gridRef)} : ${esc(c.levelEs)}</gridlocation>
          <clashpoint>
            <pos3f x="${c.point[0]}" y="${c.point[1]}" z="${c.point[2]}" />
          </clashpoint>
          <clashobjects>
            <clashobject>
              <objectattribute>
                <name>Element ID</name>
                <value>${esc(c.elementAId)}</value>
              </objectattribute>
              <smarttags>
                <smarttag><name>Discipline</name><value>${esc(c.disciplineA)}</value></smarttag>
                <smarttag><name>Item Name</name><value>${esc(c.elementANameEs)}</value></smarttag>
              </smarttags>
            </clashobject>
            <clashobject>
              <objectattribute>
                <name>Element ID</name>
                <value>${esc(c.elementBId)}</value>
              </objectattribute>
              <smarttags>
                <smarttag><name>Discipline</name><value>${esc(c.disciplineB)}</value></smarttag>
                <smarttag><name>Item Name</name><value>${esc(c.elementBNameEs)}</value></smarttag>
              </smarttags>
            </clashobject>
          </clashobjects>
        </clashresult>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" units="m" filename="${esc(
    projectName
  )}_PORTICO2N_MEP.nwf">
  <batchtest name="JGM ConTech - Coordinacion MEP PORTICO-2N" internal_name="jgm_mep_batch" units="m">
    <clashtests>
      <clashtest name="STR vs MEP &amp; MEP vs MEP (Tolerance ${(toleranceMm / 1000).toFixed(
        3
      )} m)" test_type="hard" status="ok" tolerance="${(toleranceMm / 1000).toFixed(3)}">
        <summary total="${clashes.length}" new="${activeCount}" active="${activeCount}" reviewed="${reviewCount}" approved="0" resolved="${resolvedCount}">
          <testtype>Hard / Clearance</testtype>
          <generated>${nowIso}</generated>
        </summary>
        <clashresults>
${resultXml}
        </clashresults>
      </clashtest>
    </clashtests>
  </batchtest>
</exchange>`;
}

/**
 * Parses an authentic Autodesk Navisworks Clash Detective XML report (.xml) uploaded by the user.
 */
export function parseNavisworksXmlReport(xmlText: string): ImportedNavisworksClash[] {
  if (typeof DOMParser === "undefined") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Archivo XML inválido o corrupto.");
  }

  const out: ImportedNavisworksClash[] = [];
  const tests = Array.from(doc.querySelectorAll("clashtest"));

  const extractFromNode = (node: Element, testName: string, idx: number) => {
    const name = node.getAttribute("name") || `Clash-${idx + 1}`;
    const status = (node.getAttribute("status") || "active").toLowerCase();
    const rawDist = parseFloat(node.getAttribute("distance") || "0");
    const distanceMm = Math.round(Math.abs(isNaN(rawDist) ? 0 : rawDist) * 1000);
    const gridLocation = node.querySelector("gridlocation")?.textContent?.trim() || "N/A";
    const pos = node.querySelector("clashpoint pos3f");
    const px = parseFloat(pos?.getAttribute("x") || "0") || 0;
    const py = parseFloat(pos?.getAttribute("y") || "0") || 0;
    const pz = parseFloat(pos?.getAttribute("z") || "0") || 0;

    const objs = Array.from(node.querySelectorAll("clashobject"));
    const readObjLabel = (o: Element | undefined, fallback: string) => {
      if (!o) return fallback;
      const tags = Array.from(o.querySelectorAll("smarttag"));
      const itemTag = tags.find(
        (t) => t.querySelector("name")?.textContent?.toLowerCase().includes("item")
      );
      if (itemTag?.querySelector("value")?.textContent) {
        return itemTag.querySelector("value")!.textContent!.trim();
      }
      const attrVal = o.querySelector("objectattribute value")?.textContent?.trim();
      if (attrVal) return attrVal;
      return fallback;
    };

    out.push({
      id: `NW-${String(out.length + 1).padStart(3, "0")}`,
      testName,
      name,
      status,
      distanceMm,
      gridLocation,
      point: [px, py, pz],
      itemA: readObjLabel(objs[0], "Elemento A"),
      itemB: readObjLabel(objs[1], "Elemento B"),
    });
  };

  if (tests.length > 0) {
    for (const t of tests) {
      const tName = t.getAttribute("name") || "Navisworks Clash Test";
      const results = Array.from(t.querySelectorAll("clashresult"));
      results.forEach((r, idx) => extractFromNode(r, tName, idx));
    }
  } else {
    const results = Array.from(doc.querySelectorAll("clashresult"));
    results.forEach((r, idx) => extractFromNode(r, "Imported Navisworks Test", idx));
  }

  return out;
}

/**
 * Exports OpenBIM BCF-compatible JSON issues package with 3D camera viewpoints.
 */
export function buildBcfJsonReport(projectName: string, clashes: DetectedClash[]): string {
  const payload = {
    schema: "OpenBIM-BCF-v3.0-JSON",
    platform: "JGM ConTech • Gerencia BIM 5D",
    project: projectName,
    model: "PORTICO-2N (STR + MEP)",
    generated_at: new Date().toISOString(),
    topics: clashes.map((c) => ({
      guid: `bcf-p2n-${c.id.toLowerCase()}`,
      topic_type: "Clash",
      topic_status:
        c.status === "resolved" ? "Closed" : c.status === "review" ? "InProgress" : "Open",
      priority: c.severity,
      title: `${c.id}: ${c.titleEs}`,
      description: `${c.causeEs} Solución BIM: ${c.solutionEs}`,
      disciplines: [c.disciplineA, c.disciplineB],
      reference_norm: c.normRef,
      estimated_rework_savings_cop: c.reworkSavingsCop,
      viewpoint: {
        camera_target: { x: c.point[0], y: c.point[1], z: c.point[2] },
        camera_position: {
          x: Number((c.point[0] + 2.4).toFixed(3)),
          y: Number((c.point[1] + 1.5).toFixed(3)),
          z: Number((c.point[2] + 2.4).toFixed(3)),
        },
        penetration_mm: c.penetrationMm,
        components_selection: [c.elementAId, c.elementBId],
      },
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Exports Excel-ready UTF-8 CSV Clash Matrix.
 */
export function buildClashCsvReport(clashes: DetectedClash[], lang: "es" | "en"): string {
  const isEn = lang === "en";
  const headers = isEn
    ? [
        "Clash ID",
        "Test Set",
        "Severity",
        "Status",
        "Discipline A",
        "Element A",
        "Discipline B",
        "Element B",
        "Level",
        "Grid",
        "Penetration (mm)",
        "Coord X (m)",
        "Coord Y (m)",
        "Coord Z (m)",
        "BIM Resolution",
        "Avoided Rework (COP)",
      ]
    : [
        "ID Clash",
        "Prueba",
        "Severidad",
        "Estado",
        "Disciplina A",
        "Elemento A",
        "Disciplina B",
        "Elemento B",
        "Nivel",
        "Eje",
        "Penetracion (mm)",
        "Coord X (m)",
        "Coord Y (m)",
        "Coord Z (m)",
        "Solucion BIM",
        "Ahorro Retrabajo (COP)",
      ];

  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = clashes.map((c) =>
    [
      c.id,
      c.testSet,
      c.severity.toUpperCase(),
      c.status.toUpperCase(),
      c.disciplineA,
      isEn ? c.elementANameEn : c.elementANameEs,
      c.disciplineB,
      isEn ? c.elementBNameEn : c.elementBNameEs,
      isEn ? c.levelEn : c.levelEs,
      c.gridRef,
      c.penetrationMm,
      c.point[0],
      c.point[1],
      c.point[2],
      isEn ? c.solutionEn : c.solutionEs,
      c.reworkSavingsCop,
    ]
      .map(q)
      .join(",")
  );
  return "\uFEFF" + [headers.map(q).join(","), ...rows].join("\r\n");
}
