import porticoSpec from "./portico2n.spec.json";

export type Portico2nSpec = typeof porticoSpec;
export const PORTICO_2N_SPEC: Portico2nSpec = porticoSpec;

export interface PorticoTakeoffSummary {
  footingConcreteM3: number;
  pedestalConcreteM3: number;
  gradeBeamConcreteM3: number;
  foundationConcreteM3: number;
  groundSlabConcreteM3: number;
  groundSlabAreaM2: number;
  columnConcreteM3: number;
  floorBeamConcreteM3: number;
  roofBeamConcreteM3: number;
  floorSlabConcreteM3: number;
  floorSlabAreaM2: number;
  balconyAreaM2: number;
  stairConcreteM3: number;
  superstructureConcreteM3: number;
  roofSlabConcreteM3: number;
  roofSlabAreaM2: number;
  roofScreedConcreteM3: number;
  roofDrainDeckAreaM2: number;
  totalConcreteM3: number;
  parapetMasonryM2: number;
  wallsMainMasonryM2: number;
  masonryAreaM2: number;
  plasterAreaM2: number;
  flooringAreaM2: number;
  ceilingAreaM2: number;
  alfajiaLengthMl: number;
  downspoutLengthMl: number;
  rebarSteelKg: number;
  railingLengthMl: number;
  doorsCount: number;
  windowsCount: number;
  openingsCount: number;
  wallPaintAreaM2: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Computes exact parametric 3D quantities from portico2n.spec.json
 * so 3D geometry, BOQ budgets, Field logs, and CAD sheets match 1:1.
 */
export function computePorticoTakeoffs(): PorticoTakeoffSummary {
  const s = PORTICO_2N_SPEC;

  // 1. Spread footings Z1..Z9
  let footingConcreteM3 = 0;
  for (const item of s.footings.items) {
    const t = s.footings.types[item.type as keyof typeof s.footings.types];
    footingConcreteM3 += t.b * t.b * t.h;
  }

  // 2. Pedestals 40x40 cm between footingTop (-1.10) and gradeBeamTop (-0.10)
  const pedH = Math.abs(s.levels.gradeBeamTop - s.levels.footingTop);
  const pedestalConcreteM3 = s.footings.items.length * s.pedestal.b * s.pedestal.b * pedH;

  // 3. Grade beams VC 30x35 cm (net length between 40cm pedestals)
  const vcSpec = s.beamTypes.VC;
  let gradeBeamLen = 0;
  for (const bm of s.beams.filter((b) => b.type === "VC")) {
    const gross = Math.abs(bm.to - bm.from);
    const ded = bm.supports.length * s.pedestal.b;
    gradeBeamLen += Math.max(0, gross - ded);
  }
  const gradeBeamConcreteM3 = gradeBeamLen * vcSpec.b * vcSpec.h;

  // 4. Ground slab CP-1
  const gs = s.slabs.groundSlab;
  const groundSlabAreaM2 = (gs.x1 - gs.x0) * (gs.z1 - gs.z0);
  const groundSlabConcreteM3 = groundSlabAreaM2 * gs.thickness;

  // 5. Columns C1..C9 (from gradeBeamTop -0.10 uniformly up to roofDeck +5.80)
  let colNetLen = 0;
  for (const c of s.columns.items) {
    colNetLen += Math.max(0, c.top - s.levels.gradeBeamTop);
  }
  const columnConcreteM3 = colNetLen * s.columns.b * s.columns.b;

  // 6. Upper floor beams VE (30x40 cm, net clear length between 30cm columns)
  const veSpec = s.beamTypes.VE;
  let veNetLen = 0;
  for (const bm of s.beams.filter((b) => b.type === "VE")) {
    const ded = bm.supports.length * s.columns.b;
    veNetLen += Math.max(0, Math.abs(bm.to - bm.from) - ded);
  }
  const floorBeamConcreteM3 = veNetLen * veSpec.b * veSpec.h;

  // 7. Orthogonal roof tie-beams VCU (25x30 cm on X axes A,B,C & Z axes 1,2,3)
  const vcuSpec = s.beamTypes.VCU;
  let vcuNetLen = 0;
  for (const bm of s.beams.filter((b) => b.type === "VCU")) {
    const ded = bm.supports.length * s.columns.b;
    vcuNetLen += Math.max(0, Math.abs(bm.to - bm.from) - ded);
  }
  const roofBeamConcreteM3 = vcuNetLen * vcuSpec.b * vcuSpec.h;

  // 8. Floor 2 Slab L-1 (minus stair void) + Front Balcony LV-1
  const fs = s.slabs.floorSlab;
  const bal = s.slabs.balcony;
  const voidArea = (fs.void.x1 - fs.void.x0) * (fs.void.z1 - fs.void.z0);
  const floorSlabAreaM2 = (fs.x1 - fs.x0) * (fs.z1 - fs.z0) - voidArea;
  const balconyAreaM2 = (bal.x1 - bal.x0) * (bal.z1 - bal.z0);
  const floorSlabConcreteM3 = (floorSlabAreaM2 + balconyAreaM2) * fs.thickness;

  // 9. Roof Solid RC Slab L-2 (8.30 x 7.30 m x 0.12 m, no opening) + 1% drainage screed topping
  const rs = s.slabs.roofSlab;
  const roofSlabAreaM2 = (rs.x1 - rs.x0) * (rs.z1 - rs.z0);
  const roofSlabConcreteM3 = roofSlabAreaM2 * rs.thickness;

  const rf = s.roof;
  const roofDrainDeckAreaM2 = (rf.deckX1 - rf.deckX0) * (rf.deckZ1 - rf.deckZ0);
  const avgScreedThickness = (rf.screedMin + rf.screedMax) / 2;
  const roofScreedConcreteM3 = roofDrainDeckAreaM2 * avgScreedThickness;

  // 10. Concrete Stair ESC-1 (2 waist flights + 18 steps + mid landing)
  const st = s.stair;
  const flightHoriz = Math.abs(st.flight1.x1 - st.flight1.x0);
  const flightRise = st.flight1.y1 - st.flight1.y0;
  const waistSlopeLen = Math.hypot(flightHoriz, flightRise);
  const waistVol = 2 * (waistSlopeLen * st.waist * st.width);
  const stepTrianglesVol = st.risersPerFlight * 2 * (0.5 * st.tread * st.riser * st.width);
  const landingArea = (st.landing.x1 - st.landing.x0) * (st.landing.z1 - st.landing.z0);
  const landingVol = landingArea * (st.waist + 0.03);
  const stairConcreteM3 = waistVol + stepTrianglesVol + landingVol;

  // 11. CMU No. 12 Masonry Walls (N1 & N2 net + upper 1.00m Parapet) + two-sided plaster & paint
  let wallGrossArea = 0;
  let openingsArea = 0;
  let doorsCount = 0;
  let windowsCount = 0;
  for (const w of s.walls) {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const underVeBeam =
      w.level === 1 &&
      (w.ext ||
        (Math.abs(w.z1 - w.z2) < 0.01 && Math.abs(w.z1) < 0.01) ||
        (Math.abs(w.x1 - w.x2) < 0.01 && Math.abs(w.x1) < 0.01));
    const hBase = w.level === 1 ? (underVeBeam ? 2.6 : 2.88) : 2.5;
    wallGrossArea += len * hBase;
    for (const op of w.openings) {
      openingsArea += op.w * (op.head - op.sill);
      if (op.kind === "window") windowsCount++;
      else doorsCount++;
    }
  }
  const wallsMainMasonryM2 = Math.max(0, wallGrossArea - openingsArea);

  let parapetMasonryM2 = 0;
  let alfajiaLengthMl = 0;
  for (const p of s.parapets) {
    const pLen = Math.hypot(p.x2 - p.x1, p.z2 - p.z1);
    parapetMasonryM2 += pLen * p.height;
    alfajiaLengthMl += pLen;
  }
  const masonryAreaM2 = wallsMainMasonryM2 + parapetMasonryM2;
  const plasterAreaM2 = masonryAreaM2 * 2;

  // 12. Room porcelain floor areas (Level 1 + Level 2 interior + Balcony) + Drywall Ceiling N2
  let flooringAreaM2 = 0;
  for (const r of s.rooms) {
    for (const [rx0, rz0, rx1, rz1] of r.rects) {
      flooringAreaM2 += Math.abs(rx1 - rx0) * Math.abs(rz1 - rz0);
    }
  }
  const c = rf.ceiling;
  const ceilingAreaM2 = (c.x1 - c.x0) * (c.z1 - c.z0) - voidArea * 0.85;

  // 13. 4" Sanitary PVC Rainwater Downspout (horizontal wall penetration + vertical drop + grade shoe)
  const dr = rf.drain;
  const horizCollectorLen = Math.abs(dr.pipeX - dr.sumpX) + 0.12;
  const verticalDropLen = Math.abs(dr.topY - dr.bottomY);
  const downspoutLengthMl = horizCollectorLen + verticalDropLen + 0.45; // incl. 45deg discharge bend & fittings

  // 14. Estimated Grade 60 PDR-60 reinforcing steel across foundations, columns, VE/VCU beams, L-1, L-2, LV-1, ESC-1
  const baseFrameSteelKg = 5420;
  const roofSlabSteelKg = roofSlabAreaM2 * 11.2; // bidirectional #3 @ 0.20 + top neg bastones
  const roofExtraBeamsKg = (3 * 7.3 - 2.7) * 14.5; // VCU-1..3 Z beams net of ridge col delta
  const rebarSteelKg = Math.round(baseFrameSteelKg + roofSlabSteelKg + roofExtraBeamsKg);

  // 15. Guardrails
  let railingLengthMl = 0;
  for (const rl of s.railings) {
    railingLengthMl += Math.hypot(rl.x2 - rl.x1, rl.z2 - rl.z1);
  }

  const foundationConcreteM3 = footingConcreteM3 + pedestalConcreteM3 + gradeBeamConcreteM3;
  const superstructureConcreteM3 =
    columnConcreteM3 + floorBeamConcreteM3 + roofBeamConcreteM3 + floorSlabConcreteM3 + stairConcreteM3;
  const totalConcreteM3 =
    foundationConcreteM3 + groundSlabConcreteM3 + superstructureConcreteM3 + roofSlabConcreteM3;

  return {
    footingConcreteM3: round2(footingConcreteM3),
    pedestalConcreteM3: round2(pedestalConcreteM3),
    gradeBeamConcreteM3: round2(gradeBeamConcreteM3),
    foundationConcreteM3: round2(foundationConcreteM3),
    groundSlabConcreteM3: round2(groundSlabConcreteM3),
    groundSlabAreaM2: round2(groundSlabAreaM2),
    columnConcreteM3: round2(columnConcreteM3),
    floorBeamConcreteM3: round2(floorBeamConcreteM3),
    roofBeamConcreteM3: round2(roofBeamConcreteM3),
    floorSlabConcreteM3: round2(floorSlabConcreteM3),
    floorSlabAreaM2: round2(floorSlabAreaM2),
    balconyAreaM2: round2(balconyAreaM2),
    stairConcreteM3: round2(stairConcreteM3),
    superstructureConcreteM3: round2(superstructureConcreteM3),
    roofSlabConcreteM3: round2(roofSlabConcreteM3),
    roofSlabAreaM2: round2(roofSlabAreaM2),
    roofScreedConcreteM3: round2(roofScreedConcreteM3),
    roofDrainDeckAreaM2: round2(roofDrainDeckAreaM2),
    totalConcreteM3: round2(totalConcreteM3),
    parapetMasonryM2: round2(parapetMasonryM2),
    wallsMainMasonryM2: round2(wallsMainMasonryM2),
    masonryAreaM2: round2(masonryAreaM2),
    plasterAreaM2: round2(plasterAreaM2),
    flooringAreaM2: round2(flooringAreaM2),
    ceilingAreaM2: round2(ceilingAreaM2),
    alfajiaLengthMl: round2(alfajiaLengthMl),
    downspoutLengthMl: round2(downspoutLengthMl),
    rebarSteelKg,
    railingLengthMl: round2(railingLengthMl),
    doorsCount,
    windowsCount,
    openingsCount: doorsCount + windowsCount,
    wallPaintAreaM2: round2(plasterAreaM2),
  };
}
