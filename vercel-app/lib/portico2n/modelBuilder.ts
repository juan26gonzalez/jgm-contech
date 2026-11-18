import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { normalizarTexto } from "../calcClient";
import {
  IfcElementRenderData,
  IfcGeometryPart,
  ParsedIfcModel,
  StructuralRebarSpec,
} from "../ifcEngine";
import {
  buildCantileverBalconyRebarPackage,
  buildColumnRebarPackage,
  buildFloorSlabBidirectionalRebarPackage,
  buildFootingRebarPackage,
  buildGradeBeamRebarPackage,
  buildPedestalRebarPackage,
  buildSlabTempMeshPackage,
  buildStairRebarPackage,
  buildUpperBeamRebarPackage,
  RebarPackageResult,
} from "../rebarBuilder";
import { PORTICO_2N_SPEC } from "./takeoff";

type BarSize = "#3" | "#4" | "#5";

/**
 * Builds a complete, parametric 2-storey RC moment-frame digital twin (`PORTICO-2N`)
 * with spread footings, pedestals, columns, elevated beams, solid 2-way slabs (L-1 & L-2 roof deck),
 * 1% roof slope w/ 4" PVC rainwater downspout, 1.00 m CMU No. 12 parapet + alfajia coping,
 * cantilever front balcony, U-staircase, and CMU No. 12 block walls.
 */
export function buildPortico2nIfcModel(
  projectName = "Residencial Pórtico 2N",
  lang: "es" | "en" = "es"
): ParsedIfcModel {
  const isEn = lang === "en";
  const L = (esText: string, enText: string) => (isEn ? enText : esText);
  const s = PORTICO_2N_SPEC;

  const elements: IfcElementRenderData[] = [];
  const boundingBox = new THREE.Box3();
  let nextId = 2001;

  const pushGeometry = (opts: {
    ifcType: string;
    name: string;
    objectType: string;
    comments: string;
    level: string;
    material: string;
    bimTags?: string;
    color: number;
    opacity?: number;
    geom: THREE.BufferGeometry;
    rebarPkg?: RebarPackageResult;
  }) => {
    opts.geom.computeVertexNormals();
    opts.geom.computeBoundingBox();
    if (opts.geom.boundingBox) {
      boundingBox.union(opts.geom.boundingBox);
    }

    const rSpec: StructuralRebarSpec | undefined = opts.rebarPkg?.spec;
    const rebarSearchWords = rSpec
      ? `acero refuerzo rebar varilla estribo nsr10 nsr-10 aci318 aci-318 astm ntc2289 ${rSpec.codeColombia} ${rSpec.codeUs} ${rSpec.longitudinalEs} ${rSpec.transverseEs}`
      : "";

    const searchTextNorm = normalizarTexto(
      `${opts.ifcType} ${opts.name} ${opts.objectType} ${opts.comments} ${opts.material} ${opts.level} ${opts.bimTags || ""} ${rebarSearchWords}`
    );

    const id = nextId++;
    const parts: IfcGeometryPart[] = [
      {
        geometry: opts.geom,
        originalColor: new THREE.Color(opts.color),
        originalOpacity: opts.opacity ?? 1,
      },
      ...(opts.rebarPkg?.parts || []),
    ];

    const rawProps: Record<string, string> = {
      "GlobalId / Tag": `P2N-${id}`,
      Pset_BIM5D: opts.comments,
      Material: opts.material,
    };
    if (rSpec) {
      rawProps["Code_Colombia"] = rSpec.codeColombia;
      rawProps["Code_USA"] = rSpec.codeUs;
      rawProps["Rebar_Grade"] = isEn ? rSpec.steelGradeEn : rSpec.steelGradeEs;
      rawProps["Clear_Cover"] = `${rSpec.clearCoverMm} mm (${(rSpec.clearCoverMm / 25.4).toFixed(1)}")`;
      rawProps["Rebar_Main"] = isEn ? rSpec.longitudinalEn : rSpec.longitudinalEs;
      rawProps["Rebar_Ties"] = isEn ? rSpec.transverseEn : rSpec.transverseEs;
      rawProps["Steel_Weight"] = `${rSpec.estimatedSteelKg.toFixed(1)} kg (${(
        rSpec.estimatedSteelKg * 2.20462
      ).toFixed(1)} lb)`;
    }

    elements.push({
      expressID: id,
      meta: {
        expressID: id,
        ifcType: opts.ifcType,
        name: opts.name,
        objectType: opts.objectType,
        description: `${projectName} OpenBIM Element`,
        tag: `P2N-${id}`,
        comments: opts.comments,
        level: opts.level,
        materialNames: rSpec
          ? [opts.material, isEn ? rSpec.steelGradeEn : rSpec.steelGradeEs]
          : [opts.material],
        rawProps,
        searchTextNorm,
        rebarSpec: rSpec,
      },
      parts,
    });
  };

  const pushBox = (opts: {
    ifcType: string;
    name: string;
    objectType: string;
    comments: string;
    level: string;
    material: string;
    bimTags?: string;
    color: number;
    opacity?: number;
    w: number;
    h: number;
    d: number;
    x: number;
    y: number;
    z: number;
    rotX?: number;
    rotZ?: number;
    rebarPkg?: RebarPackageResult;
  }) => {
    const geom = new THREE.BoxGeometry(opts.w, opts.h, opts.d);
    if (opts.rotX) geom.rotateX(opts.rotX);
    if (opts.rotZ) geom.rotateZ(opts.rotZ);
    geom.translate(opts.x, opts.y, opts.z);
    pushGeometry({ ...opts, geom });
  };

  const lvl0 = L("Nivel 0 - Cimentación", "Level 0 - Foundations");
  const lvl1 = L("Nivel 1", "Level 1");
  const lvl2 = L("Nivel 2 + Balcón", "Level 2 + Balcony");
  const lvlRoof = L("Cubierta Losa RC + Antepecho", "RC Roof Slab & Parapet");

  const matFound = isEn ? s.materials.concreteFoundation.en : s.materials.concreteFoundation.es;
  const matFrame = isEn ? s.materials.concreteFrame.en : s.materials.concreteFrame.es;
  const matBlock = isEn ? s.materials.masonry.en : s.materials.masonry.es;

  // =========================================================================
  // 1. SPREAD FOOTINGS (Z1..Z9), PEDESTALS (P1..P9, 40x40), GRADE BEAMS (VC)
  // =========================================================================
  const pedH = Math.abs(s.levels.gradeBeamTop - s.levels.footingTop); // 1.00 m (-1.10 -> -0.10)
  const pedCy = (s.levels.footingTop + s.levels.gradeBeamTop) / 2; // -0.60

  for (const item of s.footings.items) {
    const ftType = s.footings.types[item.type as keyof typeof s.footings.types];
    const footCy = (s.levels.footingBottom + s.levels.footingTop) / 2;

    pushBox({
      ifcType: "IFCFOOTING",
      name: L(
        `Zapata ${item.id} (${item.type} • ${Math.round(ftType.b * 100)}×${Math.round(ftType.b * 100)} cm) Eje ${item.gx}-${item.gz}`,
        `Spread Footing ${item.id} (${item.type} • Grid ${item.gx}-${item.gz})`
      ),
      objectType: `Footing: ${item.type} ${Math.round(ftType.b * 100)}x${Math.round(ftType.b * 100)}x40cm`,
      comments: L("Zapatas, pedestales y vigas de cimentación", "Footings, pedestals & grade beams"),
      bimTags: "zapata zapatas cimentacion",
      level: lvl0,
      material: matFound,
      color: 0x64748b,
      w: ftType.b,
      h: ftType.h,
      d: ftType.b,
      x: item.x,
      y: footCy,
      z: item.z,
      rebarPkg: buildFootingRebarPackage({
        w: ftType.b,
        h: ftType.h,
        d: ftType.b,
        cx: item.x,
        cy: footCy,
        cz: item.z,
        barSize: ftType.bar as BarSize,
        spacing: ftType.spacing,
        footingTypeTag: item.type,
        includeDowels: false,
      }),
    });

    pushBox({
      ifcType: "IFCFOOTING",
      name: L(
        `Pedestal Estructural PE-${item.id.slice(1)} (40×40 cm) Eje ${item.gx}-${item.gz}`,
        `Structural Pedestal P-${item.id.slice(1)} (15.7"×15.7") Grid ${item.gx}-${item.gz}`
      ),
      objectType: "Pedestal: Reinforced Concrete 40x40cm",
      comments: L("Zapatas, pedestales y vigas de cimentación", "Footings, pedestals & grade beams"),
      bimTags: "pedestal pedestales cimentacion zapatas",
      level: lvl0,
      material: matFound,
      color: 0x475569,
      w: s.pedestal.b,
      h: pedH,
      d: s.pedestal.b,
      x: item.x,
      y: pedCy,
      z: item.z,
      rebarPkg: buildPedestalRebarPackage({
        w: s.pedestal.b,
        h: pedH,
        d: s.pedestal.b,
        cx: item.x,
        cy: pedCy,
        cz: item.z,
        footingThick: ftType.h,
        longBar: s.pedestal.longBar as BarSize,
        tieSpacing: s.pedestal.tieSpacing,
        dowelHook: s.pedestal.dowelHook,
      }),
    });
  }

  // Grade Beams VC (30x35 cm)
  const vcSpec = s.beamTypes.VC;
  for (const bm of s.beams.filter((b) => b.type === "VC")) {
    const span = Math.abs(bm.to - bm.from);
    const mid = (bm.from + bm.to) / 2;
    const isX = bm.axis === "x";
    const cy = bm.top - vcSpec.h / 2;
    const cx = isX ? mid : bm.line;
    const cz = isX ? bm.line : mid;
    const wBox = isX ? span : vcSpec.b - 0.004;
    const dBox = isX ? vcSpec.b : span;

    pushBox({
      ifcType: "IFCBEAM",
      name: L(`Viga de Cimentación ${bm.id} (30×35 cm)`, `Grade Tie-Beam ${bm.id} (30×35 cm)`),
      objectType: "Beam: Concrete Grade Tie-Beam 30x35cm",
      comments: L("Zapatas, pedestales y vigas de cimentación", "Footings, pedestals & grade beams"),
      bimTags: "zapatas pedestales vigas de cimentacion cimentacion vc",
      level: lvl0,
      material: matFound,
      color: 0x64748b,
      w: wBox,
      h: vcSpec.h - (isX ? 0 : 0.003),
      d: dBox,
      x: cx,
      y: cy,
      z: cz,
      rebarPkg: buildGradeBeamRebarPackage({
        w: isX ? span : vcSpec.b,
        h: vcSpec.h,
        d: isX ? vcSpec.b : span,
        cx,
        cy,
        cz,
        axis: bm.axis as "x" | "z",
        supports: bm.supports,
      }),
    });
  }

  // Ground Contrapiso CP-1 (e=10cm)
  const gs = s.slabs.groundSlab;
  const gsW = gs.x1 - gs.x0;
  const gsD = gs.z1 - gs.z0;
  pushBox({
    ifcType: "IFCSLAB",
    name: L("Contrapiso Armado CP-1 (e=10 cm • Malla 15×15)", "Ground Slab CP-1 (t=4\" • Welded Mesh)"),
    objectType: "Slab: Concrete Slab-on-Grade e=10cm + Wire Mesh",
    comments: L("Zapatas, pedestales y vigas de cimentación", "Footings, pedestals, grade beams & ground slab"),
    bimTags: "contrapiso plantilla losa piso cimentacion cp-1",
    level: lvl0,
    material: matFound,
    color: 0xcbd5e1,
    w: gsW,
    h: gs.thickness,
    d: gsD,
    x: (gs.x0 + gs.x1) / 2,
    y: gs.top - gs.thickness / 2,
    z: (gs.z0 + gs.z1) / 2,
    rebarPkg: buildSlabTempMeshPackage({
      w: gsW,
      h: gs.thickness,
      d: gsD,
      cx: (gs.x0 + gs.x1) / 2,
      cy: gs.top - gs.thickness / 2,
      cz: (gs.z0 + gs.z1) / 2,
      spacing: gs.meshSpacing,
    }),
  });

  // =========================================================================
  // 2. COLUMNS (C1..C9, 30x30 cm), ELEVATED BEAMS (VE 30x40), ORTHOGONAL ROOF BEAMS (VCU 25x30)
  // =========================================================================
  for (const col of s.columns.items) {
    const colH = col.top - s.levels.gradeBeamTop;
    const colCy = (col.top + s.levels.gradeBeamTop) / 2;

    pushBox({
      ifcType: "IFCCOLUMN",
      name: L(
        `Columna Estructural ${col.id} (30×30 cm • Eje ${col.gx}-${col.gz})`,
        `Structural Column ${col.id} (12"×12" • Grid ${col.gx}-${col.gz})`
      ),
      objectType: "Column: Reinforced Concrete 30x30cm",
      comments: L("Columnas, vigas aéreas y losa entrepiso", "RC columns, beams & suspended slabs"),
      bimTags: "columna columnas portico estructura",
      level: L("Niveles 1 y 2", "Levels 1 & 2"),
      material: matFrame,
      color: 0x94a3b8,
      w: s.columns.b,
      h: colH,
      d: s.columns.b,
      x: col.x,
      y: colCy,
      z: col.z,
      rebarPkg: buildColumnRebarPackage({
        w: s.columns.b,
        h: colH,
        d: s.columns.b,
        cx: col.x,
        cy: colCy,
        cz: col.z,
        isRidge: false,
        longBar: s.columns.longBar as BarSize,
        loHeight: s.columns.lo,
        confSpacing: s.columns.tieSpacingLo,
        midSpacing: s.columns.tieSpacingMid,
        jointElevations: [s.levels.npt2],
      }),
    });
  }

  // Elevated Floor Beams VE (30x40 cm)
  const veSpec = s.beamTypes.VE;
  for (const bm of s.beams.filter((b) => b.type === "VE")) {
    const span = Math.abs(bm.to - bm.from);
    const mid = (bm.from + bm.to) / 2;
    const isX = bm.axis === "x";
    const cy = bm.top - veSpec.h / 2;
    const cx = isX ? mid : bm.line;
    const cz = isX ? bm.line : mid;

    pushBox({
      ifcType: "IFCBEAM",
      name: L(`Viga Aérea Entrepiso ${bm.id} (30×40 cm)`, `Elevated Floor Beam ${bm.id} (30×40 cm)`),
      objectType: "Beam: Reinforced Concrete Entrepiso 30x40cm",
      comments: L("Columnas, vigas aéreas y losa entrepiso", "RC columns, beams & elevated slabs"),
      bimTags: "viga vigas entrepiso nivel 2 portico",
      level: lvl2,
      material: matFrame,
      color: 0x94a3b8,
      w: isX ? span : veSpec.b - 0.004,
      h: veSpec.h - (isX ? 0 : 0.003),
      d: isX ? veSpec.b : span,
      x: cx,
      y: cy,
      z: cz,
      rebarPkg: buildUpperBeamRebarPackage({
        w: isX ? span : veSpec.b,
        h: veSpec.h,
        d: isX ? veSpec.b : span,
        cx,
        cy,
        cz,
        axis: bm.axis as "x" | "z",
        supports: bm.supports,
        topBars: veSpec.top as [number, BarSize],
        botBars: veSpec.bottom as [number, BarSize],
        extraTopSupport: {
          count: 1,
          size: "#5",
          length: 1.4,
          atSupports: [0],
        },
        loLen: veSpec.lo,
        confSpacing: veSpec.tieSpacingLo,
        midSpacing: veSpec.tieSpacingMid,
      }),
    });
  }

  // Orthogonal Roof Tie-Beams VCU-A/B/C (X) & VCU-1/2/3 (Z) supporting L-2 at +5.80 m
  const vcuSpec = s.beamTypes.VCU;
  for (const bm of s.beams.filter((b) => b.type === "VCU")) {
    const span = Math.abs(bm.to - bm.from);
    const mid = (bm.from + bm.to) / 2;
    const isX = bm.axis === "x";
    const cy = bm.top - vcuSpec.h / 2;
    const cx = isX ? mid : bm.line;
    const cz = isX ? bm.line : mid;

    pushBox({
      ifcType: "IFCBEAM",
      name: L(
        `Viga Cubierta ${bm.id} (Eje ${bm.gridLine} • 25×30 cm)`,
        `Roof Tie-Beam ${bm.id} (Grid ${bm.gridLine} • 25×30 cm)`
      ),
      objectType: "Beam: RC Roof Framing Beam 25x30cm",
      comments: L("Columnas, vigas aéreas y losa entrepiso", "Structural roof tie-beams & frame"),
      bimTags: "viga vigas cubierta portico corona",
      level: lvlRoof,
      material: matFrame,
      color: 0x94a3b8,
      w: isX ? span : vcuSpec.b - 0.004,
      h: vcuSpec.h - (isX ? 0 : 0.003),
      d: isX ? vcuSpec.b : span,
      x: cx,
      y: cy,
      z: cz,
      rebarPkg: buildUpperBeamRebarPackage({
        w: isX ? span : vcuSpec.b,
        h: vcuSpec.h,
        d: isX ? vcuSpec.b : span,
        cx,
        cy,
        cz,
        axis: bm.axis as "x" | "z",
        supports: bm.supports,
        topBars: vcuSpec.top as [number, BarSize],
        botBars: vcuSpec.bottom as [number, BarSize],
        loLen: vcuSpec.lo,
        confSpacing: vcuSpec.tieSpacingLo,
        midSpacing: vcuSpec.tieSpacingMid,
      }),
    });
  }

  // =========================================================================
  // 3. FLOOR 2 SOLID SLAB L-1 (WITH STAIR VOID), CANTILEVER BALCONY LV-1 & U-STAIR ESC-1
  // =========================================================================
  const flSlab = s.slabs.floorSlab;
  const vRect = flSlab.void;
  const slabShape = new THREE.Shape();
  slabShape.moveTo(flSlab.x0, -flSlab.z1);
  slabShape.lineTo(flSlab.x1, -flSlab.z1);
  slabShape.lineTo(flSlab.x1, -flSlab.z0);
  slabShape.lineTo(flSlab.x0, -flSlab.z0);
  slabShape.closePath();

  const voidHole = new THREE.Path();
  voidHole.moveTo(vRect.x0, -vRect.z1);
  voidHole.lineTo(vRect.x0, -vRect.z0);
  voidHole.lineTo(vRect.x1, -vRect.z0);
  voidHole.lineTo(vRect.x1, -vRect.z1);
  voidHole.closePath();
  slabShape.holes.push(voidHole);

  const slabGeom = new THREE.ExtrudeGeometry(slabShape, {
    depth: flSlab.thickness,
    bevelEnabled: false,
  });
  slabGeom.rotateX(-Math.PI / 2);
  slabGeom.translate(0, flSlab.top - flSlab.thickness, 0);

  pushGeometry({
    ifcType: "IFCSLAB",
    name: L("Losa Maciza Entrepiso L-1 (e=12 cm • Hueco Escalera)", "Level 2 Solid RC Slab L-1 (t=4.7\" w/ Stair Void)"),
    objectType: "Slab: Two-Way Solid Reinforced Concrete e=12cm",
    comments: L("Losa maciza entrepiso, balcón y escalera", "Solid 2-way slab, balcony & stair"),
    bimTags: "losa losas placa entrepiso nivel 2 maciza",
    level: lvl2,
    material: matFrame,
    color: 0xaab6c5,
    geom: slabGeom,
    rebarPkg: buildFloorSlabBidirectionalRebarPackage({
      x0: flSlab.x0,
      x1: flSlab.x1,
      z0: flSlab.z0,
      z1: flSlab.z1,
      topY: flSlab.top,
      thickness: flSlab.thickness,
      voidRect: vRect,
      bottomSpacing: flSlab.bottomSpacing,
      topSpacing: flSlab.topSpacing,
      topLenInterior: flSlab.topLengthInterior,
      topLenEdge: flSlab.topLengthEdge,
    }),
  });

  // Front Cantilever Balcony Slab LV-1 (z in [3.65, 4.70])
  const bal = s.slabs.balcony;
  const balW = bal.x1 - bal.x0;
  const balD = bal.z1 - bal.z0;
  const balCx = (bal.x0 + bal.x1) / 2;
  const balCy = bal.top - bal.thickness / 2;
  const balCz = (bal.z0 + bal.z1) / 2;

  pushBox({
    ifcType: "IFCSLAB",
    name: L("Losa Balcón en Voladizo Frontal LV-1 (1.20 m a eje • e=12 cm)", "Front Cantilever Balcony Slab LV-1 (4.0 ft Projection)"),
    objectType: "Slab: RC Cantilever Balcony e=12cm",
    comments: L("Losa maciza entrepiso, balcón y escalera", "Cantilever balcony slab & top negative steel"),
    bimTags: "losa balcon voladizo nivel 2 fachada frontal",
    level: lvl2,
    material: matFrame,
    color: 0x94a3b8,
    w: balW,
    h: bal.thickness,
    d: balD,
    x: balCx,
    y: balCy,
    z: balCz,
    rebarPkg: buildCantileverBalconyRebarPackage({
      x0: bal.x0,
      x1: bal.x1,
      z0: bal.z0,
      z1: bal.z1,
      topY: bal.top,
      thickness: bal.thickness,
      anchorInside: bal.anchorInside,
      topBar: bal.topBar as BarSize,
      topSpacing: bal.topSpacing,
      distSpacing: bal.distSpacing,
    }),
  });

  // Two-Flight U-Shaped RC Staircase ESC-1
  const st = s.stair;
  const makeFlightGeom = (
    fl: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number },
    ascDir: 1 | -1
  ) => {
    const startX = ascDir === 1 ? fl.x0 : fl.x1;
    const endX = ascDir === 1 ? fl.x1 : fl.x0;
    const n = st.risersPerFlight;
    const dy = (fl.y1 - fl.y0) / n;
    const dx = (endX - startX) / (n - 1);
    const pts: Array<[number, number]> = [];
    //Trace upper stepped profile from bottom to top
    pts.push([startX, fl.y0]);
    for (let i = 0; i < n; i++) {
      const rx = startX + i * dx;
      const topYStep = fl.y0 + (i + 1) * dy;
      pts.push([rx, topYStep]);
      if (i < n - 1) {
        pts.push([startX + (i + 1) * dx, topYStep]);
      }
    }
    // Descend vertical back into soffit below top tread, slope back to soffit under bottom riser
    pts.push([endX, fl.y1 - 0.14]);
    pts.push([startX, fl.y0 - 0.14]);

    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i][0], pts[i][1]);
    }
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, { depth: fl.z1 - fl.z0, bevelEnabled: false });
    g.translate(0, 0, fl.z0);
    return g;
  };

  const fl1Geom = makeFlightGeom(st.flight1, 1);
  const fl2Geom = makeFlightGeom(st.flight2, -1);
  const landW = st.landing.x1 - st.landing.x0;
  const landD = st.landing.z1 - st.landing.z0;
  const landGeom = new THREE.BoxGeometry(landW, 0.14, landD);
  landGeom.translate(
    (st.landing.x0 + st.landing.x1) / 2,
    st.landing.top - 0.07,
    (st.landing.z0 + st.landing.z1) / 2
  );

  // Convert non-indexed geometries consistently before merging
  const stairParts = [fl1Geom.toNonIndexed(), fl2Geom.toNonIndexed(), landGeom.toNonIndexed()].map(
    (g) => {
      g.deleteAttribute("uv");
      return g;
    }
  );
  const stairMerged = mergeGeometries(stairParts, false);
  fl1Geom.dispose();
  fl2Geom.dispose();
  landGeom.dispose();
  stairParts.forEach((g) => g.dispose());

  if (stairMerged) {
    pushGeometry({
      ifcType: "IFCSTAIR",
      name: L("Escalera Concreto Armado en U ESC-1 (N1 → Descanso +1.50 → N2)", "U-Shaped RC Staircase ESC-1 (Level 1 → Level 2)"),
      objectType: "Stair: Reinforced Concrete Two-Flight U-Stair (18 Risers)",
      comments: L("Losa maciza entrepiso, balcón y escalera", "RC two-flight staircase"),
      bimTags: "escalera gradas descanso concreto nivel 1 nivel 2",
      level: L("Niveles 1 y 2", "Levels 1 & 2"),
      material: matFrame,
      color: 0x94a3b8,
      geom: stairMerged,
      rebarPkg: buildStairRebarPackage({
        flight1: st.flight1,
        landing: st.landing,
        flight2: st.flight2,
        waist: st.waist,
        mainSpacing: st.mainSpacing,
        distSpacing: st.distSpacing,
      }),
    });
  }

  // Balcony & Stair Guardrails (IFCRAILING)
  for (const rl of s.railings) {
    const len = Math.hypot(rl.x2 - rl.x1, rl.z2 - rl.z1);
    const isX = Math.abs(rl.x2 - rl.x1) > Math.abs(rl.z2 - rl.z1);
    const cx = (rl.x1 + rl.x2) / 2;
    const cz = (rl.z1 + rl.z2) / 2;
    const baseY = s.levels.npt2;

    const railParts: THREE.BufferGeometry[] = [];
    // Top stainless steel handrail
    const topRail = new THREE.BoxGeometry(isX ? len : 0.05, 0.04, isX ? 0.05 : len);
    topRail.translate(cx, baseY + rl.h, cz);
    railParts.push(topRail);

    // Mid steel bar
    const midRail = new THREE.BoxGeometry(isX ? len : 0.03, 0.025, isX ? 0.03 : len);
    midRail.translate(cx, baseY + rl.h * 0.52, cz);
    railParts.push(midRail);

    // Base shoe bar & intermediate posts
    const nPosts = Math.max(2, Math.round(len / 1.15) + 1);
    for (let i = 0; i < nPosts; i++) {
      const t = i / (nPosts - 1);
      const px = rl.x1 + (rl.x2 - rl.x1) * t;
      const pz = rl.z1 + (rl.z2 - rl.z1) * t;
      const post = new THREE.BoxGeometry(0.04, rl.h, 0.04);
      post.translate(px, baseY + rl.h / 2, pz);
      railParts.push(post);
    }

    const rMerged = mergeGeometries(railParts, false);
    railParts.forEach((g) => g.dispose());
    if (rMerged) {
      pushGeometry({
        ifcType: "IFCRAILING",
        name: L(
          `Baranda Metálica + Vidrio ${rl.id} (${rl.id.startsWith("BAR-4") || rl.id.startsWith("BAR-5") ? "Vacío Escalera" : "Balcón Frontal"})`,
          `Architectural Steel & Glass Guardrail ${rl.id}`
        ),
        objectType: "Railing: Powder-Coated Steel Posts + Handrail",
        comments: L("Ventanería, puertas y barandas balcón", "Glazing, doors & balcony guardrails"),
        bimTags: "baranda pasamano balcon escalera nivel 2",
        level: lvl2,
        material: isEn ? "Powder-Coated Steel & Tempered Glass" : "Acero Pintado + Vidrio Templado",
        color: 0x1e293b,
        geom: rMerged,
      });
    }
  }

  // =========================================================================
  // 4. INTERIOR FINISH ROOM SLABS (CLICKABLE PER ROOM IN HABITACIONES BIM)
  // =========================================================================
  for (const room of s.rooms) {
    const isLvl1 = room.level === 1;
    const isBalcony = room.id.includes("BALCON");
    const floorY = isLvl1 ? 0.008 : 3.008;
    const rectGeoms: THREE.BufferGeometry[] = [];
    let area = 0;

    for (const [rx0, rz0, rx1, rz1] of room.rects) {
      const rw = Math.abs(rx1 - rx0);
      const rd = Math.abs(rz1 - rz0);
      area += rw * rd;
      const g = new THREE.BoxGeometry(rw - 0.02, 0.014, rd - 0.02);
      g.translate((rx0 + rx1) / 2, floorY, (rz0 + rz1) / 2);
      rectGeoms.push(g);
    }

    const mergedRoom = rectGeoms.length === 1 ? rectGeoms[0] : mergeGeometries(rectGeoms, false);
    if (rectGeoms.length > 1) rectGeoms.forEach((g) => g.dispose());

    if (mergedRoom) {
      pushGeometry({
        ifcType: "IFCSLAB",
        name: L(
          `Piso Porcelanato 51×51 - ${room.name} (${area.toFixed(1)} m²)`,
          `20"×20" Porcelain Floor - ${room.nameEn} (${area.toFixed(1)} m²)`
        ),
        objectType: isBalcony ? "Floor: Anti-Slip Exterior Porcelain" : "Floor: Interior Porcelain Tile",
        comments: `${room.name} - Porcelanato`,
        bimTags: `porcelanato piso enchape ${room.name} ${room.nameEn} ${isLvl1 ? "nivel 1" : "nivel 2"}`,
        level: isLvl1 ? lvl1 : lvl2,
        material: isBalcony
          ? isEn
            ? "Anti-Slip Exterior Porcelain"
            : "Porcelanato Exterior Antideslizante"
          : isEn
          ? "Executive Gray Porcelain Tile"
          : "Porcelanato Gris Ejecutivo",
        color: isBalcony ? 0xcbd5e1 : isLvl1 ? 0xdbeafe : 0xe2e8f0,
        geom: mergedRoom,
      });
    }
  }

  // =========================================================================
  // 5. CMU BLOCK NO. 12 WALLS WITH EXACT WINDOW / DOOR CUTOUTS
  // =========================================================================
  for (const w of s.walls) {
    const dx = w.x2 - w.x1;
    const dz = w.z2 - w.z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const angleY = -Math.atan2(dz, dx);
    const yBase = w.level === 1 ? s.levels.npt1 : s.levels.npt2;
    const underVeBeam =
      w.level === 1 &&
      (w.ext ||
        (Math.abs(w.z1 - w.z2) < 0.01 && Math.abs(w.z1) < 0.01) ||
        (Math.abs(w.x1 - w.x2) < 0.01 && Math.abs(w.x1) < 0.01));
    const baseHeight = w.level === 1 ? (underVeBeam ? 2.6 : 2.88) : 2.5;

    const wallShape = new THREE.Shape();
    wallShape.moveTo(0, 0);
    wallShape.lineTo(len, 0);
    wallShape.lineTo(len, baseHeight);
    wallShape.lineTo(0, baseHeight);
    wallShape.closePath();

    for (const op of w.openings) {
      const u0 = Math.max(0.02, op.c - op.w / 2);
      const u1 = Math.min(len - 0.02, op.c + op.w / 2);
      const v0 = Math.max(0.005, op.sill);
      const v1 = Math.min(baseHeight - 0.05, op.head);
      if (u1 - u0 < 0.15 || v1 - v0 < 0.15) continue;

      const hole = new THREE.Path();
      hole.moveTo(u0, v0);
      hole.lineTo(u0, v1);
      hole.lineTo(u1, v1);
      hole.lineTo(u1, v0);
      hole.closePath();
      wallShape.holes.push(hole);

      // Build matching IFCWINDOW or IFCDOOR cleanly centered inside opening
      const ux = dx / len;
      const uz = dz / len;
      const oc = (u0 + u1) / 2;
      const cxOp = w.x1 + ux * oc;
      const czOp = w.z1 + uz * oc;
      const opH = v1 - v0;
      const opW = u1 - u0;
      const cyOp = yBase + (v0 + v1) / 2;

      const opGeom = new THREE.BoxGeometry(
        opW,
        opH,
        op.kind === "window" ? 0.08 : 0.11
      );
      opGeom.rotateY(angleY);
      opGeom.translate(cxOp, cyOp, czOp);

      if (op.kind === "window") {
        pushGeometry({
          ifcType: "IFCWINDOW",
          name: L(
            `Ventana Aluminio ${op.id} (${opW.toFixed(2)}×${opH.toFixed(2)} m)`,
            `Aluminum Acoustic Window ${op.id} (${opW.toFixed(2)}×${opH.toFixed(2)} m)`
          ),
          objectType: "Window: Aluminum Glazing + Laminated Glass",
          comments: L("Ventanería, puertas y barandas balcón", "Aluminum glazing & doors"),
          bimTags: "ventana ventaneria vidrio aluminio carpinteria",
          level: w.level === 1 ? lvl1 : lvl2,
          material: isEn ? "Anodized Aluminum + Laminated Glass" : "Aluminio Anodizado + Vidrio Laminado",
          color: 0x38bdf8,
          opacity: 0.45,
          geom: opGeom,
        });
      } else {
        const isBalconyDoor = op.kind === "balconyDoor";
        pushGeometry({
          ifcType: "IFCDOOR",
          name: L(
            `${isBalconyDoor ? "Puerta-Ventana Corrediza Balcón" : "Puerta Arquitectónica"} ${op.id} (${opW.toFixed(2)}×${opH.toFixed(2)} m)`,
            `${isBalconyDoor ? "Sliding Balcony Glass Door" : "Architectural Door"} ${op.id} (${opW.toFixed(2)}×${opH.toFixed(2)} m)`
          ),
          objectType: isBalconyDoor ? "Door: Sliding Balcony Glass 1.60m" : "Door: Flush Wood Frame",
          comments: L("Ventanería, puertas y barandas balcón", "Doors & balcony glazing"),
          bimTags: `puerta puertas acceso ${isBalconyDoor ? "balcon corrediza vidrio" : "madera"}`,
          level: w.level === 1 ? lvl1 : lvl2,
          material: isBalconyDoor
            ? isEn
              ? "Aluminum Slider + Tempered Glass"
              : "Aluminio Corredizo + Vidrio Templado"
            : isEn
            ? "Solid Core Walnut Timber"
            : "Madera Sólida Nogal",
          color: isBalconyDoor ? 0x0ea5e9 : 0x78350f,
          opacity: isBalconyDoor ? 0.52 : 1,
          geom: opGeom,
        });
      }
    }

    const wallGeom = new THREE.ExtrudeGeometry(wallShape, {
      depth: s.wallThickness,
      bevelEnabled: false,
    });
    wallGeom.translate(0, 0, -s.wallThickness / 2);
    wallGeom.rotateY(angleY);
    wallGeom.translate(w.x1, yBase, w.z1);

    pushGeometry({
      ifcType: "IFCWALL",
      name: L(
        `Muro ${w.id} Bloque Concreto N° 12 (${w.ext ? "Fachada" : "Divisorio"} N${w.level})`,
        `Wall ${w.id} CMU Block No. 12 (${w.ext ? "Exterior" : "Partition"} L${w.level})`
      ),
      objectType: w.ext
        ? "Basic Wall: CMU No. 12 + Stucco Finish"
        : "Basic Wall: CMU No. 12 Interior Partition",
      comments: L(
        w.ext ? "Mampostería bloque N° 12 y pañete" : "Estuco plástico y pintura vinílica",
        w.ext ? "CMU No. 12 masonry & stucco" : "Interior partition masonry & paint"
      ),
      bimTags: "mamposteria bloque 12 muros panete estuco pintura",
      level: w.level === 1 ? lvl1 : lvl2,
      material: matBlock,
      color: w.ext ? 0xdbe3ec : 0xe5e7eb,
      geom: wallGeom,
    });
  }

  // =========================================================================
  // 6. LEVEL 2 SUSPENDED DRYWALL CEILING + FRESCASA ECO INSULATION
  // =========================================================================
  const cl = s.roof.ceiling;
  const ceilShape = new THREE.Shape();
  ceilShape.moveTo(cl.x0, -cl.z1);
  ceilShape.lineTo(cl.x1, -cl.z1);
  ceilShape.lineTo(cl.x1, -cl.z0);
  ceilShape.lineTo(cl.x0, -cl.z0);
  ceilShape.closePath();

  const ceilGeom = new THREE.ExtrudeGeometry(ceilShape, { depth: 0.06, bevelEnabled: false });
  ceilGeom.rotateX(-Math.PI / 2);
  ceilGeom.translate(0, cl.y - 0.06, 0);

  pushGeometry({
    ifcType: "IFCCOVERING",
    name: L("Cielo Raso Drywall Acústico Nivel 2 (y=+5.40 m)", "Level 2 Suspended Drywall Ceiling (y=+5.40 m)"),
    objectType: "Ceiling: Acoustic Drywall 1/2\"",
    comments: L("Cielo raso drywall y aislamiento Frescasa", "Suspended drywall ceiling & insulation"),
    bimTags: "cielo raso cielorraso drywall nivel 2",
    level: lvl2,
    material: isEn ? "Acoustic Gypsum Board" : "Drywall Acústico + Omega",
    color: 0xf8fafc,
    geom: ceilGeom,
  });

  pushBox({
    ifcType: "IFCCOVERING",
    name: L('Aislamiento Termoacústico Frescasa Eco 2-1/2" (Nivel 2)', 'Frescasa Eco 2-1/2" Thermal-Acoustic Insulation'),
    objectType: "Insulation: Fiberglass Batts 2-1/2\"",
    comments: L("Cielo raso drywall y aislamiento Frescasa", "Frescasa Eco thermal-acoustic insulation"),
    bimTags: "frescasa aislamiento fibra vidrio cielo raso cubierta",
    level: lvl2,
    material: isEn ? 'Frescasa Eco 2-1/2" Fiberglass' : "Fibra de Vidrio Frescasa Eco",
    color: 0xa3e635,
    opacity: 0.85,
    w: cl.x1 - cl.x0 - 0.1,
    h: 0.06,
    d: cl.z1 - cl.z0 - 0.1,
    x: (cl.x0 + cl.x1) / 2,
    y: cl.y + 0.035,
    z: (cl.z0 + cl.z1) / 2,
  });

  // =========================================================================
  // 7. SOLID RC ROOF SLAB (L-2), 1% SLOPED WATERPROOF SCREED, 1.00m PARAPET,
  //    PERIMETER CONCRETE ALFAJÍA & 4" SANITARY PVC RAINWATER DOWNSPOUT
  // =========================================================================
  const rf = s.roof;
  const rSlab = s.slabs.roofSlab;

  // 7A. Solid Reinforced Concrete Roof Slab L-2 (8.30 x 7.30 x 0.12 m, two-way #3 @ 0.20)
  pushBox({
    ifcType: "IFCSLAB",
    name: L(
      "Losa Maciza Cubierta L-2 (f'c=24 MPa • e=12 cm • +5.80 m)",
      "Solid RC Roof Slab L-2 (f'c=3,500 psi • t=4.7\" • +19.0 ft)"
    ),
    objectType: "Slab: Two-Way Solid Reinforced Concrete Roof e=12cm",
    comments: L(
      "Losa cubierta concreto f'c=24 MPa e=12cm, pendiente 1% e impermeabilización",
      "Solid RC flat roof slab w/ 1% drainage slope"
    ),
    bimTags: "losa losas cubierta l-2 l2 maciza concreto techo",
    level: lvlRoof,
    material: matFrame,
    color: 0xaab6c5,
    w: rSlab.x1 - rSlab.x0,
    h: rSlab.thickness,
    d: rSlab.z1 - rSlab.z0,
    x: (rSlab.x0 + rSlab.x1) / 2,
    y: rSlab.top - rSlab.thickness / 2,
    z: (rSlab.z0 + rSlab.z1) / 2,
    rebarPkg: buildFloorSlabBidirectionalRebarPackage({
      x0: rSlab.x0,
      x1: rSlab.x1,
      z0: rSlab.z0,
      z1: rSlab.z1,
      topY: rSlab.top,
      thickness: rSlab.thickness,
      voidRect: null,
      bottomSpacing: rSlab.bottomSpacing,
      topSpacing: rSlab.topSpacing,
      topLenInterior: rSlab.topLengthInterior,
      topLenEdge: rSlab.topLengthEdge,
      isRoofSlab: true,
    }),
  });

  // 7B. 1% Drainage Slope Mortar Screed + Elastomeric Waterproof Membrane
  // Front edge (Eje C, z=+3.50): +0.09 m above L-2 (+5.89 m); Rear Eje A (z=-3.50): +0.02 m (+5.82 m) => exact 1.00% fall (7cm / 7.00m)
  const screedShape = new THREE.Shape();
  const deckHalfZ = (rf.deckZ1 - rf.deckZ0) / 2; // 3.50 m
  screedShape.moveTo(-deckHalfZ, 0);
  screedShape.lineTo(deckHalfZ, 0);
  screedShape.lineTo(deckHalfZ, rf.screedMax);
  screedShape.lineTo(-deckHalfZ, rf.screedMin);
  screedShape.closePath();

  const deckWidthX = rf.deckX1 - rf.deckX0; // 8.00 m
  const screedGeom = new THREE.ExtrudeGeometry(screedShape, {
    depth: deckWidthX,
    bevelEnabled: false,
  });
  // After rotateY(-PI/2): local shape X (+Z in Three) -> +Z, shape Y -> +Y, depth (+Z) -> -X
  screedGeom.rotateY(-Math.PI / 2);
  screedGeom.translate(rf.deckX1, rSlab.top, (rf.deckZ0 + rf.deckZ1) / 2);

  pushGeometry({
    ifcType: "IFCROOF",
    name: L(
      "Mortero Afine Pendiente 1% + Impermeabilización Elastomérica Cubierta",
      "1% Sloped Drainage Screed + Elastomeric Roof Waterproofing"
    ),
    objectType: "Roof: 1% Sloped Mortar Screed & Acrylic Waterproof Membrane",
    comments: L(
      "Losa cubierta concreto f'c=24 MPa e=12cm, pendiente 1% e impermeabilización",
      "1% drainage slope toward rear 4\" PVC drain sump"
    ),
    bimTags: "cubierta mortero pendiente 1% impermeabilizacion afine desague agua lluvia",
    level: lvlRoof,
    material: isEn ? s.materials.waterproof.en : s.materials.waterproof.es,
    color: 0x64748b,
    geom: screedGeom,
  });

  // 7C. 1.00 m Upper CMU Bloque N° 12 Parapet Walls (PAR-A, PAR-C, PAR-1, PAR-3) + Perimeter Alfajía Coping
  const alfW = rf.alfajiaWidth; // 0.23 m (4 cm drip overhang past both 0.15 m faces)
  const alfH = rf.alfajiaHeight; // 0.07 m
  const matAlf = isEn ? s.materials.alfajia.en : s.materials.alfajia.es;

  const makeAlfajiaGeom = (len: number, isX: boolean) => {
    const hw = alfW / 2;
    const crownH = alfH;
    const edgeH = alfH - 0.015; // Wash slope on top + drip lip projection
    const shape = new THREE.Shape();
    shape.moveTo(-hw, 0);
    shape.lineTo(hw, 0);
    shape.lineTo(hw, edgeH);
    shape.lineTo(0, crownH);
    shape.lineTo(-hw, edgeH);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    if (isX) {
      g.rotateY(-Math.PI / 2);
      g.translate(len / 2, 0, 0);
    } else {
      g.translate(0, 0, -len / 2);
    }
    return g;
  };

  for (const par of s.parapets) {
    const dx = par.x2 - par.x1;
    const dz = par.z2 - par.z1;
    const len = Math.hypot(dx, dz);
    const isX = Math.abs(dx) >= Math.abs(dz);
    const cx = (par.x1 + par.x2) / 2;
    const cz = (par.z1 + par.z2) / 2;
    const parCy = s.levels.roofDeck + par.height / 2;

    pushBox({
      ifcType: "IFCWALL",
      name: L(
        `Antepecho Cubierta ${par.id} — ${par.sideEs} (Bloque N°12 • h=1.00 m)`,
        `Roof Parapet ${par.id} — ${par.sideEn} (CMU No.12 • h=3.3 ft)`
      ),
      objectType: "Wall: CMU No. 12 Roof Parapet h=1.00m",
      comments: L("Muros mampostería bloque No. 12", "1.00 m CMU No. 12 roof parapet wall"),
      bimTags: "muro muros mamposteria bloque 12 antepecho parapeto cubierta",
      level: lvlRoof,
      material: matBlock,
      color: 0xe2e8f0,
      w: isX ? len : par.thickness,
      h: par.height,
      d: isX ? par.thickness : len,
      x: cx,
      y: parCy,
      z: cz,
    });

    const alfId = par.id.replace("PAR-", "ALF-");
    const alfLen = isX
      ? len + rf.alfajiaDripOverhang * 2
      : Math.max(0.2, len - rf.alfajiaDripOverhang * 2);
    const alfGeom = makeAlfajiaGeom(alfLen, isX);
    alfGeom.translate(cx, s.levels.parapetTop, cz);

    pushGeometry({
      ifcType: "IFCCOVERING",
      name: L(
        `Alfajía Perimetral Concreto ${alfId} (23×7 cm c/ Cortagoteras)`,
        `Concrete Parapet Coping ${alfId} (9"×2.8" w/ Drip Groove)`
      ),
      objectType: "Coping: Cast Concrete Alfajía w/ Drip Edge",
      comments: L(
        "Alfajía perimetral concreto c/ cortagoteras sobre antepecho cubierta",
        "Cast concrete coping cap on parapet wall"
      ),
      bimTags: "alfajia alfajía cortagoteras remate parapeto antepecho cubierta",
      level: lvlRoof,
      material: matAlf,
      color: 0xf8fafc,
      geom: alfGeom,
    });
  }

  // 7D. Corner Roof Sump (Tragante Ø 4") & 4" Sanitary PVC Rainwater Downspout BLL-1 (Eje A/3)
  const dr = rf.drain;
  const pipeRadius = dr.diameterM / 2; // 0.055 m (4" nominal PVC = 110 mm)
  const pipeParts: THREE.BufferGeometry[] = [];
  const normalizePart = (g: THREE.BufferGeometry) => {
    const out = g.index ? g.toNonIndexed() : g;
    if (out.getAttribute("uv")) out.deleteAttribute("uv");
    return out;
  };

  // Roof corner sump bowl / dome strainer on top of sloped screed (+5.825)
  const sumpGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.045, 16);
  sumpGeo.translate(dr.sumpX, s.levels.roofDeck + rf.screedMin + 0.018, dr.sumpZ);
  pipeParts.push(normalizePart(sumpGeo));

  // Horizontal 4" sanitary PVC stub penetrating parapet bottom out to exterior riser (x: sumpX -> pipeX)
  const stubLen = dr.pipeX - dr.sumpX;
  const stubGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, stubLen, 16);
  stubGeo.rotateZ(Math.PI / 2);
  stubGeo.translate((dr.sumpX + dr.pipeX) / 2, dr.topY, dr.pipeZ);
  pipeParts.push(normalizePart(stubGeo));

  // Exterior 90-degree sanitary elbow hub at top of riser
  const elbowHub = new THREE.CylinderGeometry(pipeRadius * 1.18, pipeRadius * 1.18, 0.14, 16);
  elbowHub.translate(dr.pipeX, dr.topY - 0.02, dr.pipeZ);
  pipeParts.push(normalizePart(elbowHub));

  // Vertical 4" sanitary PVC downspout shaft down East wall/column line (topY -> bottomY + 0.14)
  const riserBot = dr.bottomY + 0.14;
  const riserH = dr.topY - riserBot;
  const riserGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, riserH, 16);
  riserGeo.translate(dr.pipeX, (dr.topY + riserBot) / 2, dr.pipeZ);
  pipeParts.push(normalizePart(riserGeo));

  // Pipe bell couplings + steel anchoring clamps to facade every ~1.25 m
  for (const clampY of [0.95, 2.15, 3.35, 4.55, 5.55]) {
    const collar = new THREE.CylinderGeometry(pipeRadius * 1.24, pipeRadius * 1.24, 0.055, 14);
    collar.translate(dr.pipeX, clampY, dr.pipeZ);
    pipeParts.push(normalizePart(collar));

    const anchorBracket = new THREE.BoxGeometry(0.11, 0.035, 0.05);
    anchorBracket.translate(dr.pipeX - 0.045, clampY, dr.pipeZ);
    pipeParts.push(normalizePart(anchorBracket));
  }

  // Bottom 45-degree discharge elbow & concrete splash pad at grade
  const shoeGeo = new THREE.CylinderGeometry(pipeRadius * 1.05, pipeRadius * 1.08, 0.28, 16);
  shoeGeo.rotateZ(-Math.PI / 4);
  shoeGeo.translate(dr.pipeX + 0.09, dr.bottomY + 0.08, dr.pipeZ);
  pipeParts.push(normalizePart(shoeGeo));

  const mergedPipe = mergeGeometries(pipeParts, false);
  pipeParts.forEach((g) => g.dispose());

  if (mergedPipe) {
    pushGeometry({
      ifcType: "IFCPIPESEGMENT",
      name: L(
        'Bajante Aguas Lluvias BLL-1 (Tubería PVC Sanitaria Ø 4" + Tragante)',
        'Rainwater Downspout BLL-1 (4" Sanitary PVC Pipe + Roof Drain)'
      ),
      objectType: 'PipeSegment: 4" (110mm) Sanitary PVC Rainwater Downspout',
      comments: L(
        'Bajante aguas lluvias tubería PVC sanitaria Ø 4" + tragante',
        '4" PVC sanitary rainwater downspout connected to 1% sloped roof drain'
      ),
      bimTags: "bajante tubo tuberia pvc sanitario 4 pulgadas desague agua lluvia tragante pluvial",
      level: lvlRoof,
      material: isEn ? s.materials.rainPipe.en : s.materials.rainPipe.es,
      color: 0xeab308,
      geom: mergedPipe,
    });
  }

  return {
    filename: "Portico_2N_Vivienda_Balcon_BIM5D.ifc",
    sizeBytes: 1348200,
    elements,
    boundingBox,
  };
}
