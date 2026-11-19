import * as THREE from "three";
import { PORTICO_2N_SPEC } from "./takeoff";

export type MepDiscipline = "HVAC" | "PLU" | "ELEC" | "GAS" | "PCI";
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
  colorOverride?: number;
  emissive?: number;
  opacity?: number;
}

export interface MepPipePart {
  kind: "pipe";
  p0: [number, number, number];
  p1: [number, number, number];
  radius: number;
  colorOverride?: number;
  emissive?: number;
  opacity?: number;
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
    | "electrical_panel"
    | "gas_line"
    | "pci_line";
  nameEs: string;
  nameEn: string;
  levelEs: string;
  levelEn: string;
  specEs: string;
  specEn: string;
  normRef: string;
  color: number;
  /** Default Pre-BIM geometry parts (may collide with STR or other MEP) */
  parts: MepPartGeom[];
  /** Clash ID that triggers rerouting this element when resolved */
  clashRuleId?: string;
  /** Coordinated BIM geometry parts applied when clashRuleId is resolved */
  resolvedParts?: MepPartGeom[];
}

export interface MepFixtureDef {
  id: string;
  discipline: MepDiscipline;
  category: "sanitary" | "kitchen" | "electrical" | "lighting" | "hvac" | "gas" | "pci";
  roomEs: string;
  roomEn: string;
  levelEs: string;
  levelEn: string;
  nameEs: string;
  nameEn: string;
  connectedToEs: string;
  connectedToEn: string;
  normCode: string;
  normDetailEs: string;
  normDetailEn: string;
  color: number;
  focusPoint: [number, number, number];
  cameraPos: [number, number, number];
  parts: MepPartGeom[];
}

export interface NormativeStandardSummary {
  id: string;
  discipline: MepDiscipline;
  code: string;
  titleEs: string;
  titleEn: string;
  requirementsEs: string;
  requirementsEn: string;
  colorHex: string;
  focusPoint: [number, number, number];
  cameraPos: [number, number, number];
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
  currentlyColliding: boolean;
  penetrationMm: number;
  point: [number, number, number];
  overlapSize: [number, number, number];
  status: ClashWorkflowStatus;
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
  GAS: "#eab308",
  PCI: "#e11d48",
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
    if (bm.type === "VC") continue;
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
 * Full 3D MEP Distribution Network for PORTICO-2N:
 * - HVAC (ASHRAE 62.1 & 90.1 / NTC)
 * - Plumbing & Rainwater (NTC 1500 & RAS)
 * - Electrical & Lighting (RETIE / NTC 2050 / RETILAP)
 * - Natural Gas (NTC 2505)
 * - Fire Protection PCI (NSR-10 Títulos J y K / NFPA 13-72)
 */
export const PORTICO_2N_MEP_ELEMENTS: MepElementDef[] = [
  // =========================================================================
  // 1. HVAC / MECHANICAL (M) — ASHRAE 62.1 & 90.1 / NTC
  // =========================================================================
  {
    id: "HVAC-COND",
    discipline: "HVAC",
    subSystem: "hvac_equip",
    nameEs: "Unidad Condensadora HVAC Cubierta (3 TR Inverter SEER 18)",
    nameEn: "Rooftop HVAC Condensing Unit (3-Ton Inverter SEER 18)",
    levelEs: "Cubierta (+5.88 m)",
    levelEn: "Roof (+5.88 m)",
    specEs: "Base concreto 10 cm + amortiguadores neopreno",
    specEn: "4\" concrete pad + neoprene vibration isolators",
    normRef: "ASHRAE 90.1 (Eficiencia Energética) / NTC",
    color: 0x0891b2,
    parts: [
      { kind: "box", x: -1.9, y: 6.26, z: -2.05, w: 0.96, h: 0.68, d: 0.52 },
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
    specEs: "Lámina galvanizada cal. 24 + aislamiento R-6",
    specEn: "24-ga galvanized sheet metal + R-6 insulation",
    normRef: "ASHRAE 62.1 / ASHRAE 90.1",
    color: 0x06b6d4,
    parts: [
      { kind: "box", x: -1.9, y: 5.42, z: 0.05, w: 0.32, h: 0.12, d: 4.35 },
      { kind: "box", x: -1.9, y: 4.08, z: -1.65, w: 0.28, h: 2.68, d: 0.22 },
      // Branch stub to Hab. 3 diffuser
      { kind: "box", x: -2.28, y: 5.42, z: -1.6, w: 0.76, h: 0.1, d: 0.2 },
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
    normRef: "ASHRAE 62.1 / NSR-10 C.6.3",
    color: 0x22d3ee,
    clashRuleId: "CLH-002",
    parts: [{ kind: "box", x: 0.15, y: 5.58, z: 1.75, w: 4.1, h: 0.18, d: 0.28 }],
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
    normRef: "ASHRAE 62.1 / NSR-10 C.6.3",
    color: 0x06b6d4,
    clashRuleId: "CLH-001",
    parts: [{ kind: "box", x: -1.9, y: 2.74, z: 0.25, w: 0.32, h: 0.2, d: 3.7 }],
    resolvedParts: [
      { kind: "box", x: -1.9, y: 2.74, z: -0.975, w: 0.32, h: 0.2, d: 1.25 },
      { kind: "box", x: -1.9, y: 2.58, z: -0.35, w: 0.32, h: 0.42, d: 0.2 },
      { kind: "box", x: -1.9, y: 2.42, z: 0.0, w: 0.32, h: 0.2, d: 0.88 },
      { kind: "box", x: -1.9, y: 2.58, z: 0.35, w: 0.32, h: 0.42, d: 0.2 },
      { kind: "box", x: -1.9, y: 2.74, z: 1.225, w: 0.32, h: 0.2, d: 1.75 },
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
    normRef: "ASHRAE 62.1 / 90.1",
    color: 0x22d3ee,
    parts: [
      { kind: "box", x: -1.9, y: 2.6, z: 1.8, w: 0.26, h: 0.36, d: 0.24 },
      { kind: "box", x: 0.15, y: 2.46, z: 1.8, w: 4.1, h: 0.16, d: 0.26 },
    ],
  },

  // =========================================================================
  // 2. PLUMBING & RAINWATER (P) — NTC 1500 & RAS (RES. 0330)
  // =========================================================================
  {
    id: "AF-TANK",
    discipline: "PLU",
    subSystem: "potable_water",
    nameEs: "Tanque Reserva Agua Potable 1,000 L (RAS / NTC 1500)",
    nameEn: "1,000 L Potable Water Reserve Tank (RAS / NTC 1500)",
    levelEs: "Cubierta (+5.90 m)",
    levelEn: "Roof (+5.90 m)",
    specEs: "Polietileno tricapa + flotador + válvula cheque + rebose",
    specEn: "Triple-layer HDPE tank + float, check & overflow valve",
    normRef: "NTC 1500 / RAS Res. 0330",
    color: 0x1d4ed8,
    parts: [
      { kind: "pipe", p0: [-3.1, 5.9, -2.55], p1: [-3.1, 6.82, -2.55], radius: 0.48 },
    ],
  },
  {
    id: "AF-MONT-1",
    discipline: "PLU",
    subSystem: "potable_water",
    nameEs: 'Montante Agua Potable Fría Ø 1½" + Ramales Aparatos (NTC 1500)',
    nameEn: '1½" Cold Potable Water Riser + Fixture Stubs (NTC 1500)',
    levelEs: "Niveles 1–2",
    levelEn: "Levels 1–2",
    specEs: "PVC Presión RDE 21 NTC 382 • Conexiones Baño N1, Cocina y Baño N2",
    specEn: "Pressure PVC • Connected to Bath L1, Kitchen Sink & Bath L2",
    normRef: "NTC 1500 / RAS",
    color: 0x2563eb,
    parts: [
      // Incoming service line from front West street meter under N1 slab
      { kind: "pipe", p0: [-2.2, 0.12, 3.3], p1: [-2.2, 0.12, -3.15], radius: 0.036 },
      // Vertical potable riser inside rear wet chase
      { kind: "pipe", p0: [-2.2, 0.12, -3.15], p1: [-2.2, 4.9, -3.15], radius: 0.042 },
      // N1 distribution manifold at y=0.58 serving Baño Social (WC + Lavamanos) & Cocina (Lavaplatos + Calentador)
      { kind: "pipe", p0: [-3.65, 0.58, -3.15], p1: [-1.85, 0.58, -3.15], radius: 0.026 },
      // Stub down to Baño Social WC (-3.20, 0.25, -3.15)
      { kind: "pipe", p0: [-3.2, 0.58, -3.15], p1: [-3.2, 0.24, -3.15], radius: 0.02 },
      // Stub along West wall to Baño Social Lavamanos (-3.65, 0.58, -2.15)
      { kind: "pipe", p0: [-3.65, 0.58, -3.15], p1: [-3.65, 0.58, -2.15], radius: 0.022 },
      // Stub up to Kitchen Sink faucet (-1.90, 0.88, -3.15)
      { kind: "pipe", p0: [-1.9, 0.58, -3.15], p1: [-1.9, 0.92, -3.15], radius: 0.022 },
      // Stub to Gas Water Heater (-2.25, 1.30, -2.55)
      { kind: "pipe", p0: [-2.2, 1.25, -3.15], p1: [-2.25, 1.25, -2.55], radius: 0.022 },
      // N2 manifold at y=3.65 serving Baño 1 N2 (Ducha, WC, Lavamanos)
      { kind: "pipe", p0: [-2.2, 3.65, -3.15], p1: [-0.42, 3.65, -3.15], radius: 0.026 },
      // Shower riser up to mixer & shower head (-1.35, 3.65 -> 5.05, -3.15)
      { kind: "pipe", p0: [-1.35, 3.65, -3.15], p1: [-1.35, 5.05, -3.15], radius: 0.02 },
      // Stub along West wall to WC N2 (-1.58, 3.30, -2.18)
      { kind: "pipe", p0: [-1.58, 3.65, -3.15], p1: [-1.58, 3.3, -2.18], radius: 0.02 },
      // Stub along East wall to Lavamanos N2 (-0.42, 3.60, -2.18)
      { kind: "pipe", p0: [-0.42, 3.65, -3.15], p1: [-0.42, 3.6, -2.18], radius: 0.02 },
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
    normRef: "NTC 1500 / NSR-10 C.6.3.4",
    color: 0x3b82f6,
    clashRuleId: "CLH-006",
    parts: [
      { kind: "pipe", p0: [-2.2, 4.9, -3.15], p1: [-3.92, 4.9, -3.42], radius: 0.038 },
      { kind: "pipe", p0: [-3.92, 4.9, -3.42], p1: [-3.92, 6.42, -3.42], radius: 0.042 },
      { kind: "pipe", p0: [-3.92, 6.42, -3.42], p1: [-3.1, 6.42, -2.55], radius: 0.038 },
    ],
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
    nameEs: 'Bajante Aguas Negras SAN-1 (Ø 4") + Descargas N1 (NTC 1500)',
    nameEn: '4" Sanitary Soil Stack SAN-1 + L1 Fixture Drains (NTC 1500)',
    levelEs: "Niveles 0–2",
    levelEn: "Levels 0–2",
    specEs: "PVC Sanitaria NTC 1087 • Sifones Baño Social y Lavaplatos",
    specEn: "Sanitary PVC • Connected to Powder Room WC/Sink & Kitchen Sink",
    normRef: "NTC 1500 / RAS",
    color: 0xd97706,
    parts: [
      { kind: "pipe", p0: [-3.2, -0.62, -3.18], p1: [-3.2, 3.15, -3.18], radius: 0.055 },
      { kind: "pipe", p0: [-3.2, -0.62, -3.18], p1: [-3.2, -0.68, 3.85], radius: 0.055 },
      // Drain branch from Baño Social Lavamanos (-3.65, 0.44, -2.15) to SAN-BAJ-1
      { kind: "pipe", p0: [-3.65, 0.44, -2.15], p1: [-3.65, 0.36, -3.18], radius: 0.026 },
      { kind: "pipe", p0: [-3.65, 0.36, -3.18], p1: [-3.2, 0.32, -3.18], radius: 0.026 },
      // Drain branch from Kitchen Sink trap (-1.90, 0.48, -3.08) to SAN-BAJ-1
      { kind: "pipe", p0: [-1.9, 0.72, -3.08], p1: [-1.9, 0.42, -3.18], radius: 0.028 },
      { kind: "pipe", p0: [-1.9, 0.42, -3.18], p1: [-3.2, 0.34, -3.18], radius: 0.032 },
    ],
  },
  {
    id: "SAN-COL-N2",
    discipline: "PLU",
    subSystem: "sanitary",
    nameEs: 'Colector Sanitario Baño Nivel 2 (PVC Ø 4" • Pendiente 2%)',
    nameEn: 'Level 2 Bathroom 4" Sanitary Collector (2% Slope)',
    levelEs: "Nivel 2 (Bajo Losa L-1)",
    levelEn: "Level 2 (Below Slab L-1)",
    specEs: "Recoge sanitario, ducha y lavamanos Baño 1 N2",
    specEn: "Collects L2 Bathroom WC, shower drain & vanity trap",
    normRef: "NTC 1500 / NSR-10 C.6.3",
    color: 0xf59e0b,
    clashRuleId: "CLH-003",
    parts: [
      { kind: "pipe", p0: [-1.35, 3.01, -2.95], p1: [-1.35, 2.81, -2.2], radius: 0.032 }, // Shower drain
      { kind: "pipe", p0: [-0.42, 3.55, -2.18], p1: [-0.42, 2.78, -2.2], radius: 0.028 }, // Vanity drain
      { kind: "pipe", p0: [-1.25, 2.8, -2.2], p1: [0.55, 2.74, -2.2], radius: 0.055 }, // Collides with VE-2
    ],
    resolvedParts: [
      { kind: "pipe", p0: [-1.35, 3.01, -2.95], p1: [-1.35, 2.81, -2.2], radius: 0.032 },
      { kind: "pipe", p0: [-0.42, 3.55, -2.18], p1: [-0.42, 2.81, -2.2], radius: 0.028 },
      { kind: "pipe", p0: [-0.42, 2.81, -2.2], p1: [-1.25, 2.78, -2.2], radius: 0.038 },
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
    normRef: "NTC 1500 Cap. 12 / RAS",
    color: 0xca8a04,
    parts: [
      { kind: "pipe", p0: [3.72, 5.82, -3.22], p1: [4.23, 5.82, -3.22], radius: 0.055 },
      { kind: "pipe", p0: [4.23, 5.82, -3.22], p1: [4.23, 0.18, -3.22], radius: 0.055 },
    ],
  },

  // =========================================================================
  // 3. ELECTRICAL & LIGHTING (E) — RETIE / NTC 2050 / RETILAP
  // =========================================================================
  {
    id: "ELEC-PANELS",
    discipline: "ELEC",
    subSystem: "electrical_panel",
    nameEs: "Tablero TG-N1, Subtablero ST-N2 y Bajantes GFCI (RETIE)",
    nameEn: "Main Panel TG-N1, Subpanel ST-N2 & GFCI Drops (RETIE / NEC)",
    levelEs: "Niveles 1–2 (Eje 2-B)",
    levelEn: "Levels 1–2 (Grid 2-B)",
    specEs: "24 circuitos bifásicos + barraje tierra SPT + circuitos GFCI 20A",
    specEn: "24-circuit panelboard + ground bus + 20A GFCI wet circuits",
    normRef: "RETIE / NTC 2050 Sec. 210.8",
    color: 0xb91c1c,
    parts: [
      { kind: "box", x: 0.65, y: 1.45, z: -0.26, w: 0.42, h: 0.58, d: 0.14 },
      { kind: "box", x: 0.65, y: 4.35, z: -0.26, w: 0.36, h: 0.48, d: 0.14 },
      { kind: "pipe", p0: [0.65, 1.74, -0.26], p1: [0.65, 4.11, -0.26], radius: 0.032 },
      // Orthogonal EMT conduit run from TG-N1 to Kitchen GFCI wall drop (-1.35, 1.15..2.46, -3.25)
      { kind: "pipe", p0: [0.65, 2.46, -0.26], p1: [-1.35, 2.46, -0.26], radius: 0.02 },
      { kind: "pipe", p0: [-1.35, 2.46, -0.26], p1: [-1.35, 2.46, -3.25], radius: 0.02 },
      { kind: "pipe", p0: [-1.35, 2.46, -3.25], p1: [-1.35, 1.15, -3.25], radius: 0.024 },
      // Lighting conduit drops N1 & N2 to RETILAP fixtures
      { kind: "pipe", p0: [0.65, 2.55, 1.75], p1: [-2.0, 2.55, 1.75], radius: 0.016 },
      { kind: "pipe", p0: [0.65, 2.55, 1.75], p1: [2.0, 2.55, 1.75], radius: 0.016 },
      { kind: "pipe", p0: [0.65, 5.34, -0.26], p1: [0.65, 5.34, 1.75], radius: 0.018 },
      { kind: "pipe", p0: [-2.0, 5.34, 1.75], p1: [2.0, 5.34, 1.75], radius: 0.016 },
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
    normRef: "RETIE Art. 20 / NTC 2050 / RETILAP",
    color: 0xef4444,
    clashRuleId: "CLH-004",
    parts: [
      { kind: "box", x: 0.65, y: 2.46, z: 1.32, w: 0.18, h: 0.08, d: 3.16 },
    ],
    resolvedParts: [
      { kind: "box", x: 0.65, y: 2.46, z: 0.54, w: 0.18, h: 0.08, d: 1.6 },
      { kind: "box", x: 0.65, y: 2.36, z: 1.34, w: 0.18, h: 0.24, d: 0.08 },
      { kind: "box", x: 0.65, y: 2.26, z: 1.8, w: 0.18, h: 0.08, d: 0.96 },
      { kind: "box", x: 0.65, y: 2.36, z: 2.26, w: 0.18, h: 0.24, d: 0.08 },
      { kind: "box", x: 0.65, y: 2.46, z: 2.58, w: 0.18, h: 0.08, d: 0.64 },
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
    normRef: "RETIE / NTC 2050 Sec. 210.8",
    color: 0xf97316,
    clashRuleId: "CLH-005",
    parts: [
      { kind: "box", x: 0.65, y: 3.65, z: -1.705, w: 0.14, h: 0.07, d: 2.89 },
      { kind: "box", x: -1.35, y: 3.65, z: -3.15, w: 4.0, h: 0.07, d: 0.14 },
    ],
    // COORDINATED: elevated to ST-N2 corridor y=4.35 m and offset 50 cm South (z=-2.65 m), clear of all L2 water risers & stubs!
    resolvedParts: [
      { kind: "box", x: 0.65, y: 4.35, z: -1.455, w: 0.14, h: 0.07, d: 2.39 }, // z: -0.26 -> -2.65 at y=4.35
      { kind: "box", x: -1.35, y: 4.35, z: -2.65, w: 4.0, h: 0.07, d: 0.14 }, // clear of AF-MONT-1 & all Baño N2 water stubs
    ],
  },

  // =========================================================================
  // 4. NATURAL GAS NETWORK (GAS) — NTC 2505 (EDIFICACIÓN RESIDENCIAL)
  // =========================================================================
  {
    id: "GAS-RED-1",
    discipline: "GAS",
    subSystem: "gas_line",
    nameEs: 'Red Interna Gas Natural PE-AL-PE Ø ¾" (NTC 2505)',
    nameEn: '3/4" Residential Natural Gas Piping PE-AL-PE (NTC 2505)',
    levelEs: "Nivel 1 (Fachada → Cocina)",
    levelEn: "Level 1 (Facade → Kitchen)",
    specEs: "Tubería amarilla normativa + válvulas de corte Estufa y Calentador",
    specEn: "Code-yellow gas line + individual shutoff valves (Stove & Heater)",
    normRef: "NTC 2505 / NTC 3631 (Ventilación)",
    color: 0xfacc15,
    clashRuleId: "CLH-007",
    // PRE-BIM: horizontal kitchen run at y=2.12, z=-3.25 intersects vertical GFCI electrical conduit at (-1.35, 1.15..2.46, -3.25)!
    parts: [
      { kind: "pipe", p0: [-3.72, 1.25, 3.62], p1: [-3.72, 2.12, 3.62], radius: 0.025 },
      { kind: "pipe", p0: [-3.72, 2.12, 3.62], p1: [-3.72, 2.12, -3.25], radius: 0.025 },
      { kind: "pipe", p0: [-3.72, 2.12, -3.25], p1: [-0.8, 2.12, -3.25], radius: 0.025 }, // Clashes ELEC-PANELS at x=-1.35!
      { kind: "pipe", p0: [-0.8, 2.12, -3.25], p1: [-0.8, 0.92, -3.15], radius: 0.02 }, // Drop to Stove
      { kind: "pipe", p0: [-2.25, 2.12, -3.25], p1: [-2.25, 1.48, -2.55], radius: 0.02 }, // Drop to Water Heater
    ],
    // COORDINATED: routes at lower gas manifold y=0.68 m (below counter, 470 mm clear below GFCI conduit!)
    resolvedParts: [
      { kind: "pipe", p0: [-3.72, 1.25, 3.62], p1: [-3.72, 0.68, 3.62], radius: 0.025 },
      { kind: "pipe", p0: [-3.72, 0.68, 3.62], p1: [-3.72, 0.68, -3.25], radius: 0.025 },
      { kind: "pipe", p0: [-3.72, 0.68, -3.25], p1: [-0.8, 0.68, -3.25], radius: 0.025 },
      { kind: "pipe", p0: [-0.8, 0.68, -3.25], p1: [-0.8, 0.92, -3.15], radius: 0.02 }, // Rises neatly behind Stove
      { kind: "pipe", p0: [-2.25, 0.68, -3.25], p1: [-2.25, 1.42, -2.55], radius: 0.02 }, // Rises neatly to Water Heater
    ],
  },

  // =========================================================================
  // 5. FIRE PROTECTION (PCI) — NSR-10 TÍTULOS J y K / NFPA 13-72
  // =========================================================================
  {
    id: "PCI-RED-1",
    discipline: "PCI",
    subSystem: "pci_line",
    nameEs: 'Red Contra Incendios Acero Céd. 40 Ø 1½" (NSR-10 Tít. J/K)',
    nameEn: '1½" Sch-40 Fire Protection Sprinkler Branch (NSR-10 J/K)',
    levelEs: "Niveles 1–2 (Hall Escalera → Comedor)",
    levelEn: "Levels 1–2 (Stair Hall → Dining)",
    specEs: "Tubería roja PCI + alimentación rociadores y columna detección",
    specEn: "Code-red fire piping serving stairwell & main living zone",
    normRef: "NSR-10 Títulos J y K / NFPA 13",
    color: 0xe11d48,
    clashRuleId: "CLH-008",
    // PRE-BIM: horizontal sprinkler branch at y=2.46, z=1.80 hits HVAC-N1-BR (y: 2.38..2.54, z: 1.67..1.93)!
    parts: [
      { kind: "pipe", p0: [0.3, 0.1, -1.2], p1: [0.3, 5.25, -1.2], radius: 0.032 }, // Vertical PCI riser near Stair Hall
      { kind: "pipe", p0: [0.3, 2.46, -1.2], p1: [0.3, 2.46, 1.8], radius: 0.028 },
      { kind: "pipe", p0: [0.3, 2.46, 1.8], p1: [2.35, 2.46, 1.8], radius: 0.028 }, // Collides with HVAC-N1-BR!
    ],
    // COORDINATED: routes at y=2.76, z=1.18 (clear above & 62 cm North of HVAC-N1-BR — NFPA 13 compliant)
    resolvedParts: [
      { kind: "pipe", p0: [0.3, 0.1, -1.2], p1: [0.3, 5.25, -1.2], radius: 0.032 },
      { kind: "pipe", p0: [0.3, 2.76, -1.2], p1: [0.3, 2.76, 1.18], radius: 0.028 },
      { kind: "pipe", p0: [0.3, 2.76, 1.18], p1: [2.35, 2.76, 1.18], radius: 0.028 },
    ],
  },
];

/**
 * Architectural & Engineering 3D Fixtures (Sanitaryware, Kitchen, GFCI Outlets,
 * RETILAP LED Luminaires, ASHRAE Diffusers/Extractors, Gas Appliances & PCI Safety Devices),
 * placed inside exact PORTICO-2N rooms and physically connected to the MEP piping/ducts.
 */
export const PORTICO_2N_FIXTURES: MepFixtureDef[] = [
  // ---- SANITARYWARE & KITCHEN (NTC 1500 & RAS) ----
  {
    id: "FIX-WC-N1",
    discipline: "PLU",
    category: "sanitary",
    roomEs: "Baño Social (Nivel 1)",
    roomEn: "Powder Room (Level 1)",
    levelEs: "Nivel 1",
    levelEn: "Level 1",
    nameEs: "Sanitario Bajo Consumo 4.8 L/descarga (Baño Social N1)",
    nameEn: "Low-Flow Toilet 1.28 GPF (L1 Powder Room)",
    connectedToEs: 'Descarga Ø 4" → SAN-BAJ-1 · Agua fría Ø ½" → AF-MONT-1',
    connectedToEn: '4" Drain → SAN-BAJ-1 · 1/2" Cold Water → AF-MONT-1',
    normCode: "NTC 1500 / RAS",
    normDetailEs: "Consumo ≤ 4.8 L/descarga, brida Ø 4\", llave regulación a h=0.20 m",
    normDetailEn: "Low-flow ≤ 4.8 LPF, 4\" flange, shutoff valve at h=20 cm",
    color: 0xf8fafc,
    focusPoint: [-3.2, 0.45, -2.95],
    cameraPos: [-1.4, 1.75, -1.1],
    parts: [
      { kind: "box", x: -3.2, y: 0.56, z: -3.12, w: 0.42, h: 0.44, d: 0.2, colorOverride: 0xf8fafc }, // Cistern tank
      { kind: "pipe", p0: [-3.2, 0.02, -2.88], p1: [-3.2, 0.4, -2.88], radius: 0.19, colorOverride: 0xf1f5f9 }, // Bowl
      { kind: "box", x: -3.2, y: 0.41, z: -2.88, w: 0.36, h: 0.04, d: 0.44, colorOverride: 0xe2e8f0 }, // Seat lid
    ],
  },
  {
    id: "FIX-LAV-N1",
    discipline: "PLU",
    category: "sanitary",
    roomEs: "Baño Social (Nivel 1)",
    roomEn: "Powder Room (Level 1)",
    levelEs: "Nivel 1",
    levelEn: "Level 1",
    nameEs: "Lavamanos Pedestal + Grifería Ahorradora (Baño Social N1)",
    nameEn: "Pedestal Lavatory + Water-Saving Faucet (L1 Powder Room)",
    connectedToEs: 'Sifón Ø 1½" → SAN-BAJ-1 · Punto agua fría h=0.55 m → AF-MONT-1',
    connectedToEn: '1½" Trap → SAN-BAJ-1 · Cold Water stub h=55 cm → AF-MONT-1',
    normCode: "NTC 1500 / RAS",
    normDetailEs: "Sello hidráulico 50 mm (NTC 1500), aireador ≤ 5.7 L/min",
    normDetailEn: "50 mm trap seal (NTC 1500), aerator ≤ 1.5 GPM",
    color: 0xf8fafc,
    focusPoint: [-3.65, 0.65, -2.15],
    cameraPos: [-1.8, 1.85, -0.7],
    parts: [
      { kind: "box", x: -3.65, y: 0.4, z: -2.15, w: 0.2, h: 0.78, d: 0.22, colorOverride: 0xe2e8f0 }, // Pedestal
      { kind: "box", x: -3.62, y: 0.83, z: -2.15, w: 0.42, h: 0.12, d: 0.52, colorOverride: 0xf8fafc }, // Basin
      { kind: "pipe", p0: [-3.74, 0.89, -2.15], p1: [-3.68, 1.0, -2.15], radius: 0.018, colorOverride: 0x94a3b8 }, // Faucet
    ],
  },
  {
    id: "FIX-SINK-K1",
    discipline: "PLU",
    category: "kitchen",
    roomEs: "Cocina (Nivel 1)",
    roomEn: "Kitchen (Level 1)",
    levelEs: "Nivel 1",
    levelEn: "Level 1",
    nameEs: "Mesón Cocina + Lavaplatos Acero Inox + Trampa Grasas",
    nameEn: "Kitchen Counter + Stainless Sink + Grease Trap",
    connectedToEs: 'Desagüe Ø 2" → SAN-BAJ-1 · Mezclador → AF-MONT-1',
    connectedToEn: '2" Drain → SAN-BAJ-1 · Supply → AF-MONT-1',
    normCode: "NTC 1500 / RAS",
    normDetailEs: "Sifón registrable Ø 2\", descarga con pendiente ≥ 2% NTC 1500",
    normDetailEn: "2\" accessible trap, ≥ 2% gravity drain slope NTC 1500",
    color: 0xcbd5e1,
    focusPoint: [-1.45, 0.9, -3.0],
    cameraPos: [-0.8, 2.2, -0.5],
    parts: [
      { kind: "box", x: -1.3, y: 0.45, z: -3.02, w: 2.0, h: 0.86, d: 0.62, colorOverride: 0x475569 }, // Counter cabinet
      { kind: "box", x: -1.3, y: 0.9, z: -3.02, w: 2.04, h: 0.05, d: 0.65, colorOverride: 0xe2e8f0 }, // Granite top
      { kind: "box", x: -1.9, y: 0.91, z: -3.02, w: 0.64, h: 0.06, d: 0.46, colorOverride: 0x94a3b8 }, // Stainless sink bowl
      { kind: "pipe", p0: [-1.9, 0.93, -3.22], p1: [-1.9, 1.18, -3.14], radius: 0.016, colorOverride: 0xcbd5e1 }, // Gooseneck faucet
    ],
  },
  {
    id: "FIX-WC-N2",
    discipline: "PLU",
    category: "sanitary",
    roomEs: "Baño 1 (Nivel 2)",
    roomEn: "Bathroom 1 (Level 2)",
    levelEs: "Nivel 2",
    levelEn: "Level 2",
    nameEs: "Sanitario Ecológico + Descarga Colgada (Baño 1 N2)",
    nameEn: "Low-Flow Toilet + Suspended Drain (L2 Bathroom 1)",
    connectedToEs: 'Codo Ø 4" → SAN-COL-N2 · Agua fría → AF-MONT-1',
    connectedToEn: '4" Bend → SAN-COL-N2 · Cold Water → AF-MONT-1',
    normCode: "NTC 1500 / RAS",
    normDetailEs: "Aparato ahorrador 4.8 L, ventilación sanitaria columna SAN-1",
    normDetailEn: "4.8 LPF fixture, vented via soil stack SAN-1",
    color: 0xf8fafc,
    focusPoint: [-1.38, 3.45, -2.18],
    cameraPos: [0.6, 4.7, -0.3],
    parts: [
      { kind: "box", x: -1.56, y: 3.56, z: -2.18, w: 0.2, h: 0.44, d: 0.42, colorOverride: 0xf8fafc },
      { kind: "pipe", p0: [-1.32, 3.02, -2.18], p1: [-1.32, 3.4, -2.18], radius: 0.19, colorOverride: 0xf1f5f9 },
      { kind: "box", x: -1.32, y: 3.41, z: -2.18, w: 0.44, h: 0.04, d: 0.36, colorOverride: 0xe2e8f0 },
    ],
  },
  {
    id: "FIX-LAV-N2",
    discipline: "PLU",
    category: "sanitary",
    roomEs: "Baño 1 (Nivel 2)",
    roomEn: "Bathroom 1 (Level 2)",
    levelEs: "Nivel 2",
    levelEn: "Level 2",
    nameEs: "Mueble Lavamanos + Espejo + Grifería (Baño 1 N2)",
    nameEn: "Vanity Sink Cabinet + Mirror + Faucet (L2 Bathroom 1)",
    connectedToEs: 'Sifón Ø 1½" → SAN-COL-N2 · Agua fría → AF-MONT-1',
    connectedToEn: '1½" Trap → SAN-COL-N2 · Cold Water → AF-MONT-1',
    normCode: "NTC 1500 / RAS",
    normDetailEs: "Altura montaje 0.85 m, registro limpieza sifón NTC 1500",
    normDetailEn: "Mounting height 85 cm, accessible cleanout trap NTC 1500",
    color: 0xf8fafc,
    focusPoint: [-0.42, 3.7, -2.18],
    cameraPos: [-2.1, 4.9, -0.5],
    parts: [
      { kind: "box", x: -0.42, y: 3.46, z: -2.18, w: 0.46, h: 0.72, d: 0.72, colorOverride: 0x64748b }, // Vanity
      { kind: "box", x: -0.42, y: 3.86, z: -2.18, w: 0.48, h: 0.08, d: 0.74, colorOverride: 0xf8fafc }, // Top basin
      { kind: "box", x: -0.2, y: 4.5, z: -2.18, w: 0.03, h: 0.75, d: 0.65, colorOverride: 0xbae6fd, opacity: 0.7 }, // Mirror
    ],
  },
  {
    id: "FIX-SHOWER-N2",
    discipline: "PLU",
    category: "sanitary",
    roomEs: "Baño 1 (Nivel 2)",
    roomEn: "Bathroom 1 (Level 2)",
    levelEs: "Nivel 2",
    levelEn: "Level 2",
    nameEs: "Cabina Ducha + Mezclador + Sifón de Piso Ø 2\" (Baño 1 N2)",
    nameEn: "Glass Shower Enclosure + Mixer + 2\" Floor Drain (L2 Bath 1)",
    connectedToEs: 'Sifón piso Ø 2" → SAN-COL-N2 · Rociador h=2.05 m → AF-MONT-1',
    connectedToEn: '2" Floor Drain → SAN-COL-N2 · Showerhead h=2.05 m → AF-MONT-1',
    normCode: "NTC 1500 / RAS",
    normDetailEs: "Regadera ahorradora ≤ 9.5 L/min, vidrio templado 8 mm",
    normDetailEn: "Water-saving showerhead ≤ 2.5 GPM, 8 mm tempered glass",
    color: 0x38bdf8,
    focusPoint: [-1.35, 4.1, -2.95],
    cameraPos: [0.5, 5.1, -1.0],
    parts: [
      { kind: "box", x: -1.35, y: 3.04, z: -2.95, w: 0.85, h: 0.06, d: 0.85, colorOverride: 0xe2e8f0 }, // Shower tray
      { kind: "box", x: -0.92, y: 3.98, z: -2.95, w: 0.03, h: 1.85, d: 0.85, colorOverride: 0x7dd3fc, opacity: 0.35 }, // Glass panel
      { kind: "pipe", p0: [-1.35, 5.05, -3.15], p1: [-1.35, 4.98, -2.95], radius: 0.06, colorOverride: 0xcbd5e1 }, // Shower head
      { kind: "box", x: -1.35, y: 4.1, z: -3.22, w: 0.16, h: 0.1, d: 0.06, colorOverride: 0x94a3b8 }, // Mixer valve
    ],
  },

  // ---- NATURAL GAS APPLIANCES (NTC 2505 / NTC 3631) ----
  {
    id: "FIX-GAS-METER",
    discipline: "GAS",
    category: "gas",
    roomEs: "Fachada Frontal Oeste (Acometida)",
    roomEn: "West Front Facade (Service Entry)",
    levelEs: "Nivel 1 (Exterior)",
    levelEn: "Level 1 (Exterior)",
    nameEs: "Centro de Medición, Regulador y Válvula Corte Gas (NTC 2505)",
    nameEn: "Natural Gas Meter, Regulator & Main Shutoff (NTC 2505)",
    connectedToEs: 'Acometida principal → Tubería amarilla GAS-RED-1 Ø ¾"',
    connectedToEn: 'Main service → Code-yellow 3/4" GAS-RED-1',
    normCode: "NTC 2505",
    normDetailEs: "Gabinete ventilado en fachada accesible, válvula de corte rápido",
    normDetailEn: "Vented exterior facade cabinet with quarter-turn shutoff",
    color: 0xfacc15,
    focusPoint: [-3.72, 1.25, 3.65],
    cameraPos: [-5.6, 2.2, 5.4],
    parts: [
      { kind: "box", x: -3.72, y: 1.25, z: 3.66, w: 0.38, h: 0.44, d: 0.22, colorOverride: 0xeab308 },
      { kind: "box", x: -3.72, y: 1.25, z: 3.78, w: 0.18, h: 0.14, d: 0.04, colorOverride: 0x0f172a },
    ],
  },
  {
    id: "FIX-STOVE-K1",
    discipline: "GAS",
    category: "gas",
    roomEs: "Cocina (Nivel 1)",
    roomEn: "Kitchen (Level 1)",
    levelEs: "Nivel 1",
    levelEn: "Level 1",
    nameEs: "Estufa a Gas 4 Puestos + Válvula Paso Individual (NTC 2505)",
    nameEn: "4-Burner Gas Cooktop + Individual Shutoff Valve (NTC 2505)",
    connectedToEs: 'Ramal Gas Ø ½" + válvula de paso → GAS-RED-1',
    connectedToEn: '1/2" Gas stub + shutoff valve → GAS-RED-1',
    normCode: "NTC 2505 / NTC 3631",
    normDetailEs: "Válvula accesible, manguera metálica flexible certificada NTC",
    normDetailEn: "Accessible shutoff valve + certified braided metallic connector",
    color: 0xfacc15,
    focusPoint: [-0.8, 1.05, -3.02],
    cameraPos: [0.9, 2.2, -1.1],
    parts: [
      { kind: "box", x: -0.8, y: 0.94, z: -3.02, w: 0.64, h: 0.06, d: 0.54, colorOverride: 0x1e293b }, // Cooktop
      { kind: "pipe", p0: [-0.95, 0.97, -3.14], p1: [-0.95, 1.0, -3.14], radius: 0.07, colorOverride: 0xfacc15 },
      { kind: "pipe", p0: [-0.65, 0.97, -3.14], p1: [-0.65, 1.0, -3.14], radius: 0.07, colorOverride: 0xfacc15 },
      { kind: "pipe", p0: [-0.95, 0.97, -2.9], p1: [-0.95, 1.0, -2.9], radius: 0.07, colorOverride: 0xfacc15 },
      { kind: "pipe", p0: [-0.65, 0.97, -2.9], p1: [-0.65, 1.0, -2.9], radius: 0.07, colorOverride: 0xfacc15 },
    ],
  },
  {
    id: "FIX-HEATER-K1",
    discipline: "GAS",
    category: "gas",
    roomEs: "Cocina / Zona Ropas (Nivel 1)",
    roomEn: "Kitchen / Utility (Level 1)",
    levelEs: "Nivel 1",
    levelEn: "Level 1",
    nameEs: "Calentador de Paso a Gas 10 L/min + Ducto Evacuación (NTC 2505)",
    nameEn: "Tankless Gas Water Heater 10 L/min + Flue Duct (NTC 2505)",
    connectedToEs: "Gas → GAS-RED-1 · Agua fría → AF-MONT-1 · Ducto tiro forzado",
    connectedToEn: "Gas → GAS-RED-1 · Cold Water → AF-MONT-1 · Flue exhaust",
    normCode: "NTC 2505 / NTC 3631",
    normDetailEs: "Rejillas ventilación superior/inferior ≥ 6 cm²/kW, ducto aluminio",
    normDetailEn: "Upper/lower combustion air vents + metallic flue exhaust",
    color: 0xfde047,
    focusPoint: [-2.25, 1.55, -2.55],
    cameraPos: [-0.5, 2.2, -1.2],
    parts: [
      { kind: "box", x: -2.25, y: 1.55, z: -2.55, w: 0.22, h: 0.52, d: 0.34, colorOverride: 0xf8fafc },
      { kind: "pipe", p0: [-2.25, 1.81, -2.55], p1: [-2.25, 2.38, -2.55], radius: 0.055, colorOverride: 0x94a3b8 }, // Flue duct
      { kind: "pipe", p0: [-2.25, 2.38, -2.55], p1: [-2.25, 2.38, -3.48], radius: 0.055, colorOverride: 0x94a3b8 }, // Exhaust out North wall
    ],
  },

  // ---- ELECTRICAL GFCI & LIGHTING RETILAP (RETIE / NTC 2050 / RETILAP) ----
  {
    id: "FIX-GFCI-SET",
    discipline: "ELEC",
    category: "electrical",
    roomEs: "Cocina, Baño Social N1 y Baño 1 N2",
    roomEn: "Kitchen, L1 Powder Room & L2 Bath 1",
    levelEs: "Niveles 1 y 2 (h=1.15 m)",
    levelEn: "Levels 1 & 2 (h=1.15 m)",
    nameEs: "Tomas Corrientes GFCI 20A Zonas Húmedas (3 uds • RETIE)",
    nameEn: "20A GFCI Wet-Location Outlets (3 units • RETIE / NEC 210.8)",
    connectedToEs: "Circuitos dedicados 20A + tierra → TG-N1 / ST-N2 / ELEC-ALIM-N2",
    connectedToEn: "Dedicated 20A GFCI circuits → TG-N1 / ST-N2 / ELEC-ALIM-N2",
    normCode: "RETIE / NTC 2050",
    normDetailEs: "Protección falla a tierra 5 mA obligatoria en baños y mesón cocina (Sec. 210.8)",
    normDetailEn: "5 mA ground-fault protection required in kitchen & bathrooms (NEC 210.8)",
    color: 0xf97316,
    focusPoint: [-1.35, 1.15, -3.25],
    cameraPos: [-0.2, 2.1, -1.4],
    parts: [
      { kind: "box", x: -1.35, y: 1.15, z: -3.36, w: 0.14, h: 0.1, d: 0.04, colorOverride: 0xf97316 }, // Kitchen GFCI
      { kind: "box", x: -3.84, y: 1.15, z: -2.02, w: 0.04, h: 0.1, d: 0.14, colorOverride: 0xf97316 }, // Bath N1 GFCI
      { kind: "box", x: -0.22, y: 4.15, z: -1.8, w: 0.04, h: 0.1, d: 0.14, colorOverride: 0xf97316 }, // Bath N2 GFCI
      // Standard duplex outlets Sala & Comedor (h=0.40 m)
      { kind: "box", x: -3.84, y: 0.4, z: 1.75, w: 0.04, h: 0.1, d: 0.14, colorOverride: 0xef4444 },
      { kind: "box", x: 3.84, y: 0.4, z: 1.75, w: 0.04, h: 0.1, d: 0.14, colorOverride: 0xef4444 },
    ],
  },
  {
    id: "FIX-RETILAP-LED",
    discipline: "ELEC",
    category: "lighting",
    roomEs: "Todos los Espacios (Niveles 1 y 2)",
    roomEn: "All Habitable Rooms (Levels 1 & 2)",
    levelEs: "Niveles 1 (+2.58 m) y 2 (+5.36 m)",
    levelEn: "Levels 1 (+2.58 m) & 2 (+5.36 m)",
    nameEs: "Luminarias Panel LED Empotradas (9 uds • RETILAP 150–300 lx)",
    nameEn: "Recessed LED Panel Luminaires (9 units • RETILAP 150–300 lx)",
    connectedToEs: "Circuitos alumbrado 15A → Bandeja ELEC-TR-N1 / Subtablero ST-N2",
    connectedToEn: "15A Lighting circuits → Tray ELEC-TR-N1 / Subpanel ST-N2",
    normCode: "RETILAP",
    normDetailEs: "150–200 lx alcobas/sala, 300 lx mesón cocina, IP44 en baños, ≥ 100 lm/W",
    normDetailEn: "150–200 lx living/beds, 300 lx kitchen, IP44 baths, ≥ 100 lm/W",
    color: 0xfef08a,
    focusPoint: [0.0, 3.8, 1.75],
    cameraPos: [6.8, 5.6, 7.6],
    parts: [
      // Level 1 LED Panels (Sala, Comedor, Cocina, Baño Social, Hall)
      { kind: "pipe", p0: [-2.0, 2.57, 1.75], p1: [-2.0, 2.6, 1.75], radius: 0.18, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      { kind: "pipe", p0: [2.0, 2.57, 1.75], p1: [2.0, 2.6, 1.75], radius: 0.18, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      { kind: "pipe", p0: [-1.25, 2.57, -1.75], p1: [-1.25, 2.6, -1.75], radius: 0.18, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      { kind: "pipe", p0: [-3.1, 2.57, -2.55], p1: [-3.1, 2.6, -2.55], radius: 0.14, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      { kind: "pipe", p0: [1.8, 2.57, -0.8], p1: [1.8, 2.6, -0.8], radius: 0.15, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      // Level 2 LED Panels (Hab Ppal, Hab 2, Hab 3, Baño 1)
      { kind: "pipe", p0: [-2.0, 5.34, 1.75], p1: [-2.0, 5.37, 1.75], radius: 0.18, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      { kind: "pipe", p0: [2.0, 5.34, 1.75], p1: [2.0, 5.37, 1.75], radius: 0.18, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      { kind: "pipe", p0: [-2.8, 5.34, -1.9], p1: [-2.8, 5.37, -1.9], radius: 0.16, colorOverride: 0xfef9c3, emissive: 0xfde047 },
      { kind: "pipe", p0: [-0.95, 5.34, -2.05], p1: [-0.95, 5.37, -2.05], radius: 0.14, colorOverride: 0xfef9c3, emissive: 0xfde047 },
    ],
  },

  // ---- HVAC DIFFUSERS & EXTRACTION (ASHRAE 62.1 & 90.1 / NTC) ----
  {
    id: "FIX-HVAC-TERM",
    discipline: "HVAC",
    category: "hvac",
    roomEs: "Sala, Comedor, Alcobas, Cocina y Baños",
    roomEn: "Living, Dining, Bedrooms, Kitchen & Baths",
    levelEs: "Niveles 1 y 2",
    levelEn: "Levels 1 & 2",
    nameEs: "Difusores 4 Vías (5 uds) + Extractores Baño/Campana (ASHRAE 62.1)",
    nameEn: "4-Way Diffusers (5) + Bath/Kitchen Exhaust Fans (ASHRAE 62.1)",
    connectedToEs: "Acoplados a HVAC-N1-MAIN, HVAC-N1-BR, HVAC-N2-MAIN y HVAC-N2-BR",
    connectedToEn: "Coupled to HVAC-N1-MAIN, HVAC-N1-BR, HVAC-N2-MAIN & HVAC-N2-BR",
    normCode: "ASHRAE 62.1 / 90.1",
    normDetailEs: "Extracción baños ≥ 25 L/s (50 CFM), campana cocina ≥ 50 L/s, estanqueidad ductos",
    normDetailEn: "Bath exhaust ≥ 50 CFM, kitchen hood ≥ 100 CFM, sealed R-6 ducts",
    color: 0x06b6d4,
    focusPoint: [-0.8, 2.4, 0.5],
    cameraPos: [4.8, 4.5, 5.8],
    parts: [
      // 4-way supply diffusers (N1 Sala, N1 Comedor, N2 Hab Ppal, N2 Hab 2, N2 Hab 3)
      { kind: "box", x: -1.9, y: 2.38, z: 1.8, w: 0.42, h: 0.05, d: 0.42, colorOverride: 0x67e8f9 },
      { kind: "box", x: 1.95, y: 2.36, z: 1.8, w: 0.42, h: 0.05, d: 0.42, colorOverride: 0x67e8f9 },
      { kind: "box", x: -1.9, y: 5.34, z: 1.75, w: 0.42, h: 0.05, d: 0.42, colorOverride: 0x67e8f9 },
      { kind: "box", x: 1.95, y: 5.34, z: 1.75, w: 0.42, h: 0.05, d: 0.42, colorOverride: 0x67e8f9 },
      { kind: "box", x: -2.6, y: 5.34, z: -1.6, w: 0.38, h: 0.05, d: 0.38, colorOverride: 0x67e8f9 },
      // Kitchen Range Hood over Stove (-0.80, 1.72, -3.02)
      { kind: "box", x: -0.8, y: 1.72, z: -3.02, w: 0.72, h: 0.14, d: 0.52, colorOverride: 0x94a3b8 },
      { kind: "box", x: -0.8, y: 2.15, z: -3.14, w: 0.24, h: 0.72, d: 0.22, colorOverride: 0x64748b },
      // Bathroom mechanical exhaust fans (Baño Social N1 & Baño 1 N2)
      { kind: "box", x: -3.1, y: 2.54, z: -2.95, w: 0.24, h: 0.08, d: 0.24, colorOverride: 0x0891b2 },
      { kind: "box", x: -0.95, y: 5.34, z: -2.65, w: 0.24, h: 0.08, d: 0.24, colorOverride: 0x0891b2 },
    ],
  },

  // ---- FIRE PROTECTION PCI (NSR-10 TÍTULOS J y K / NFPA 13-72) ----
  {
    id: "FIX-PCI-SAFETY",
    discipline: "PCI",
    category: "pci",
    roomEs: "Hall Escalera N1/N2, Cocina y Salida",
    roomEn: "Stair Hall L1/L2, Kitchen & Main Exit",
    levelEs: "Niveles 1 y 2",
    levelEn: "Levels 1 & 2",
    nameEs: "Extintor ABC 10 lb + Detectores Humo (4 uds) + Señal Evacuación",
    nameEn: "10 lb ABC Extinguisher + Smoke Detectors (4) + Exit Sign",
    connectedToEs: "Columna PCI-RED-1 + lazo detección incendios NSR-10 J.4",
    connectedToEn: "Fire riser PCI-RED-1 + NSR-10 J.4 detection loop",
    normCode: "NSR-10 Tít. J y K",
    normDetailEs: "Detección temprana J.4.2, extintor h≤1.50 m, señalización fotoluminiscente K.3.9",
    normDetailEn: "Early smoke detection J.4.2, extinguisher h≤1.5 m, photoluminescent exit K.3.9",
    color: 0xe11d48,
    focusPoint: [0.35, 1.45, -1.1],
    cameraPos: [3.1, 2.7, 1.4],
    parts: [
      // ABC Fire Extinguisher cylinder at Hall Escalera N1
      { kind: "pipe", p0: [0.28, 1.02, -1.05], p1: [0.28, 1.48, -1.05], radius: 0.085, colorOverride: 0xdc2626 },
      { kind: "box", x: 0.28, y: 1.54, z: -1.05, w: 0.08, h: 0.09, d: 0.08, colorOverride: 0x0f172a },
      // Manual pull station
      { kind: "box", x: 0.28, y: 1.32, z: -0.78, w: 0.05, h: 0.14, d: 0.12, colorOverride: 0xe11d48 },
      // Photoluminescent Exit Sign above Main Door P-1 (x=1.0, y=2.25, z=3.35)
      { kind: "box", x: 1.0, y: 2.26, z: 3.36, w: 0.34, h: 0.14, d: 0.05, colorOverride: 0x22c55e, emissive: 0x16a34a },
      // 4 Photoelectric Smoke / Thermal Detectors (Hall N1, Cocina, Hall N2, Hab Ppal)
      { kind: "pipe", p0: [1.55, 2.82, -0.8], p1: [1.55, 2.87, -0.8], radius: 0.075, colorOverride: 0xf8fafc, emissive: 0xe11d48 },
      { kind: "pipe", p0: [-1.25, 2.82, -1.1], p1: [-1.25, 2.87, -1.1], radius: 0.075, colorOverride: 0xf8fafc, emissive: 0xe11d48 },
      { kind: "pipe", p0: [1.55, 5.33, -0.8], p1: [1.55, 5.38, -0.8], radius: 0.075, colorOverride: 0xf8fafc, emissive: 0xe11d48 },
      { kind: "pipe", p0: [-1.6, 5.33, 1.1], p1: [-1.6, 5.38, 1.1], radius: 0.075, colorOverride: 0xf8fafc, emissive: 0xe11d48 },
    ],
  },
];

/**
 * Regulatory & Standards Compliance Matrix requested for residential BIM MEP coordination in Colombia.
 */
export const NORMATIVE_STANDARDS_CATALOG: NormativeStandardSummary[] = [
  {
    id: "STD-ELEC",
    discipline: "ELEC",
    code: "RETIE & NTC 2050",
    titleEs: "Instalaciones Eléctricas Residenciales",
    titleEn: "Residential Electrical Installations",
    requirementsEs:
      "Tableros TG-N1/ST-N2 con puesta a tierra (SPT), tomas GFCI 20A en baños y cocina (Sec. 210.8), separación reglamentaria frente a redes hidráulicas y de gas.",
    requirementsEn:
      "Grounded panels TG-N1/ST-N2, mandatory 20A GFCI outlets in kitchen & baths (NEC 210.8), code clearance from water & gas lines.",
    colorHex: "#ef4444",
    focusPoint: [0.65, 1.65, -0.26],
    cameraPos: [3.2, 2.6, 2.2],
  },
  {
    id: "STD-ILUM",
    discipline: "ELEC",
    code: "RETILAP",
    titleEs: "Iluminación Interior Eficiente",
    titleEn: "Interior Lighting Standards",
    requirementsEs:
      "9 luminarias LED empotradas (≥ 100 lm/W): 150–200 lx en alcobas/sala, 300 lx en plano de trabajo de cocina y grado hermético IP44 en baños.",
    requirementsEn:
      "9 recessed LED panels (≥ 100 lm/W): 150–200 lx living/bedrooms, 300 lx kitchen counter, IP44 damp-rated in baths.",
    colorHex: "#eab308",
    focusPoint: [0.0, 3.8, 1.75],
    cameraPos: [7.2, 5.8, 7.6],
  },
  {
    id: "STD-PLU",
    discipline: "PLU",
    code: "NTC 1500 & RAS",
    titleEs: "Plomería, Hidrosanitarias y Pluvial",
    titleEn: "Plumbing, Sanitary & Stormwater",
    requirementsEs:
      "Aparatos de bajo consumo (WC 4.8 L), sifones con sello hidráulico 50 mm, colectores PVC Ø 4\" con pendiente 2%, tanque reserva 1,000 L y bajante pluvial Ø 4\" BLL-1.",
    requirementsEn:
      "Low-flow fixtures (4.8 LPF), 50 mm trap seals, 4\" sanitary collectors at 2% slope, 1,000 L reserve tank & 4\" roof drain BLL-1.",
    colorHex: "#2563eb",
    focusPoint: [-2.1, 1.4, -2.7],
    cameraPos: [-0.2, 3.3, 0.4],
  },
  {
    id: "STD-HVAC",
    discipline: "HVAC",
    code: "ASHRAE 62.1 / 90.1 & NTC",
    titleEs: "Mecánicas, Climatización y Ventilación",
    titleEn: "HVAC, Ventilation & Energy Efficiency",
    requirementsEs:
      "Condensadora Inverter SEER 18 (ASHRAE 90.1), ductería aislada R-6 con 5 difusores 4 vías, extractores en baños ≥ 50 CFM y campana extractora cocina (ASHRAE 62.1).",
    requirementsEn:
      "SEER 18 Inverter condensing unit (ASHRAE 90.1), R-6 insulated ducts w/ 5 diffusers, ≥ 50 CFM bath exhaust & kitchen hood (ASHRAE 62.1).",
    colorHex: "#06b6d4",
    focusPoint: [-1.0, 3.6, 0.5],
    cameraPos: [5.4, 5.2, 6.2],
  },
  {
    id: "STD-PCI",
    discipline: "PCI",
    code: "NSR-10 Títulos J y K",
    titleEs: "Protección Contra Incendios (PCI)",
    titleEn: "Fire Protection & Life Safety",
    requirementsEs:
      "Columna roja PCI Ø 1½\" con rociadores despejados de ductos, 4 detectores fotoeléctricos de humo (J.4.2), extintor multipropósito ABC 10 lb y señal salida K.3.9.",
    requirementsEn:
      "1½\" code-red fire branch clear of ducts, 4 photoelectric smoke detectors (J.4.2), 10 lb ABC extinguisher & exit signage K.3.9.",
    colorHex: "#e11d48",
    focusPoint: [0.4, 1.8, -0.5],
    cameraPos: [3.6, 3.2, 2.4],
  },
  {
    id: "STD-GAS",
    discipline: "GAS",
    code: "NTC 2505 & NTC 3631",
    titleEs: "Redes Residenciales de Gas Natural",
    titleEn: "Residential Natural Gas Piping",
    requirementsEs:
      "Medidor ventilado en fachada, tubería amarilla PE-AL-PE Ø ¾\" con válvulas individuales para estufa y calentador, ducto evacuación gases y separación de circuitos eléctricos.",
    requirementsEn:
      "Vented facade meter, code-yellow 3/4\" PE-AL-PE piping with individual shutoffs for stove & heater, flue duct & electrical separation.",
    colorHex: "#ca8a04",
    focusPoint: [-1.7, 1.25, -2.9],
    cameraPos: [0.3, 2.4, -0.5],
  },
];

/**
 * Curated Navisworks-style Clash Detective Rule Definitions for PORTICO-2N (8 Real 3D Clashes).
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
    normRef: "NSR-10 C.6.3 / ASHRAE 90.1",
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
    normRef: "ASHRAE 62.1 & 90.1 / NSR-10 C.6.3",
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
    normRef: "NTC 1500 & RAS / NSR-10 C.6.3",
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
    normRef: "NSR-10 C.6.3.4 / NTC 1500",
    reworkSavingsCop: 1_450_000,
  },
  {
    id: "CLH-007",
    testSet: "MEP vs. MEP",
    disciplineA: "ELEC",
    disciplineB: "GAS",
    elementAId: "ELEC-PANELS",
    elementBId: "GAS-RED-1",
    severity: "critical",
    levelEs: "Nivel 1 — Cocina (+2.12 m)",
    levelEn: "Level 1 — Kitchen (+2.12 m)",
    gridRef: "Eje 1–2 / A",
    titleEs: "Tubería Gas Natural cruza Bajante Eléctrica GFCI Cocina (NTC 2505)",
    titleEn: "Natural Gas Pipe intersects Kitchen GFCI Electrical Conduit (NTC 2505)",
    causeEs:
      "El ramal de gas PE-AL-PE Ø ¾\" a cota +2.12 m impacta la bajante EMT del circuito GFCI de mesón cocina, violando la separación mínima de seguridad.",
    causeEn:
      "3/4\" PE-AL-PE natural gas header at +2.12 m collides directly with the kitchen GFCI electrical drop conduit.",
    solutionEs:
      "Reubicar el colector horizontal de gas a cota baja +0.68 m bajo mesón dejando 470 mm de separación libre respecto al punto eléctrico GFCI (+1.15 m).",
    solutionEn:
      "Relocate horizontal gas header to lower under-counter manifold (+0.68 m) maintaining 470 mm separation from GFCI outlet conduit.",
    normRef: "NTC 2505 / RETIE / NTC 2050",
    reworkSavingsCop: 2_350_000,
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
    normRef: "RETIE Art. 20 / RETILAP / ASHRAE",
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
    titleEn: "Level 2 Electrical Feeder intersects Potable Water Riser (RETIE/NEC)",
    causeEs:
      "La canalización eléctrica de Nivel 2 intersecta la tubería vertical de agua fría AF-MONT-1 violando separación mínima de seguridad eléctrica.",
    causeEn:
      "Level 2 electrical feeder tray intersects vertical cold-water riser AF-MONT-1 violating wet-zone electrical clearance.",
    solutionEs:
      "Elevar corredor eléctrico a cota +4.35 m (nivel subtablero ST-N2) y desplazarlo 50 cm al Sur (z = -2.65 m), superando la separación RETIE respecto a montantes y ramales hidráulicos.",
    solutionEn:
      "Raise electrical corridor to +4.35 m (subpanel ST-N2 level) and shift 50 cm South (z = -2.65 m) clearing all water risers and fixture stubs per RETIE/NEC.",
    normRef: "RETIE / NTC 2050 / NTC 1500",
    reworkSavingsCop: 1_900_000,
  },
  {
    id: "CLH-008",
    testSet: "MEP vs. MEP",
    disciplineA: "HVAC",
    disciplineB: "PCI",
    elementAId: "HVAC-N1-BR",
    elementBId: "PCI-RED-1",
    severity: "major",
    levelEs: "Nivel 1 — Comedor (+2.46 m)",
    levelEn: "Level 1 — Dining (+2.46 m)",
    gridRef: "Eje 2–3 / B–C",
    titleEs: "Ramal Contra Incendios PCI colisiona con Ducto HVAC Comedor",
    titleEn: "Fire Sprinkler Branch PCI collides with Dining HVAC Duct",
    causeEs:
      "La tubería roja PCI Ø 1½\" cruza al mismo nivel (+2.46 m) que el ducto de aire HVAC-N1-BR, impidiendo montaje y obstruyendo el patrón de descarga.",
    causeEn:
      "1½\" code-red fire branch runs at the exact same +2.46 m elevation as HVAC-N1-BR, obstructing sprinkler discharge coverage.",
    solutionEs:
      "Elevar el ramal PCI a +2.76 m y desplazarlo 62 cm al Norte (z = +1.18 m), garantizando patrón libre de rociado según NSR-10 Título J.",
    solutionEn:
      "Raise PCI branch to +2.76 m and offset 62 cm North (z = +1.18 m) to satisfy NSR-10 Title J / NFPA 13 obstruction rules.",
    normRef: "NSR-10 Títulos J y K / NFPA 13",
    reworkSavingsCop: 1_850_000,
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
 * Executes real-time 3D Clash Detection across PORTICO-2N structural targets & 5 MEP disciplines.
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

    const live = intersectBoxArrays(boxesA, boxesB, tolM);

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
          <description>${esc(c.causeEs)} | Norma: ${esc(c.normRef)} | Solucion: ${esc(c.solutionEs)}</description>
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
  )}_PORTICO2N_MEP_FULL.nwf">
  <batchtest name="JGM ConTech - Coordinacion MEP Integral PORTICO-2N" internal_name="jgm_mep_batch" units="m">
    <clashtests>
      <clashtest name="STR / HVAC / PLU / ELEC / GAS / PCI (Tolerance ${(toleranceMm / 1000).toFixed(
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
      const itemTag = tags.find((t) =>
        t.querySelector("name")?.textContent?.toLowerCase().includes("item")
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

export function buildBcfJsonReport(projectName: string, clashes: DetectedClash[]): string {
  const payload = {
    schema: "OpenBIM-BCF-v3.0-JSON",
    platform: "JGM ConTech • Gerencia BIM 5D",
    project: projectName,
    model: "PORTICO-2N (STR + HVAC + PLU + ELEC + GAS + PCI + Fixtures)",
    standards: [
      "RETIE",
      "NTC 2050",
      "RETILAP",
      "NTC 1500 & RAS",
      "ASHRAE 62.1 & 90.1",
      "NSR-10 Títulos J y K",
      "NTC 2505",
    ],
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
        "Norm / Code",
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
        "Norma Aplicable",
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
      c.normRef,
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
