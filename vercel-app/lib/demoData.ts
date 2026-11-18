import { ParsedIfcModel } from "./ifcEngine";
import { buildPortico2nIfcModel } from "./portico2n/modelBuilder";
import { computePorticoTakeoffs, PORTICO_2N_SPEC } from "./portico2n/takeoff";
import {
  BitacoraRow,
  ClientsProjectData,
  ConsolidationResult,
  GanttTask,
  LiquidationParams,
  PayrollProjectData,
  ProjectConfig,
  RoomActivityItem,
  SstProjectData,
  SuppliersProjectData,
} from "./types";

export const DEMO_SHOWCASE_PROJECT_ID = "demo_showcase";

const TAKEOFF = computePorticoTakeoffs();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isoOffsetDays(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function splitIntoShifts(total: number, weights: number[]): number[] {
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      out.push(round2(Math.max(0, total - acc)));
    } else {
      const part = round2((total * weights[i]) / sumW);
      acc = round2(acc + part);
      out.push(part);
    }
  }
  return out;
}

export function buildDemoGanttTasks(): GanttTask[] {
  return [
    {
      id: "1",
      uid: "1",
      wbs: "1",
      nombre: "FASE 1 — CIMENTACIÓN, PÓRTICO RC 2N & MAMPOSTERÍA",
      capitulo: "1. ESTRUCTURA & CIMENTACIÓN",
      inicio: isoOffsetDays(-24),
      fin: isoOffsetDays(-6),
      duracionDias: 18,
      pesoPct: 0,
      rutaCritica: true,
      esResumen: true,
    },
    {
      id: "2",
      uid: "2",
      wbs: "1.1",
      nombre: "Zapatas, pedestales, vigas VC y contrapiso f'c=21 MPa",
      capitulo: "1. ESTRUCTURA & CIMENTACIÓN",
      inicio: isoOffsetDays(-24),
      fin: isoOffsetDays(-16),
      duracionDias: 8,
      pesoPct: 15,
      rutaCritica: true,
      responsable: "Cuadrilla Estructura",
      matchItem: "1.1",
    },
    {
      id: "3",
      uid: "3",
      wbs: "1.2",
      nombre: "Columnas (+5.80m), vigas VE/VCU, losa N2 L-1, balcón y escalera",
      capitulo: "1. ESTRUCTURA & CIMENTACIÓN",
      inicio: isoOffsetDays(-18),
      fin: isoOffsetDays(-9),
      duracionDias: 9,
      pesoPct: 20,
      rutaCritica: true,
      predecesoras: ["2"],
      responsable: "Cuadrilla Estructura",
      matchItem: "1.2",
    },
    {
      id: "4",
      uid: "4",
      wbs: "1.3",
      nombre: "Muros mampostería bloque No. 12 (N1–N2 y antepecho h=1.00 m)",
      capitulo: "2. MAMPOSTERÍA & PAÑETES",
      inicio: isoOffsetDays(-10),
      fin: isoOffsetDays(-2),
      duracionDias: 8,
      pesoPct: 15,
      rutaCritica: true,
      predecesoras: ["3", "6"],
      responsable: "Cuadrilla Mampostería",
      matchItem: "2.1",
    },
    {
      id: "5",
      uid: "5",
      wbs: "2",
      nombre: "FASE 2 — LOSA CUBIERTA RC 1%, ALFAJÍA, BAJANTE 4\" & ACABADOS",
      capitulo: "3. PISOS & ENCHAPES",
      inicio: isoOffsetDays(-10),
      fin: isoOffsetDays(7),
      duracionDias: 17,
      pesoPct: 0,
      rutaCritica: true,
      esResumen: true,
    },
    {
      id: "6",
      uid: "6",
      wbs: "2.1",
      nombre: "Losa cubierta concreto e=12cm, mortero pendiente 1% e imperm.",
      capitulo: "6. CUBIERTA",
      inicio: isoOffsetDays(-10),
      fin: isoOffsetDays(-5),
      duracionDias: 5,
      pesoPct: 8,
      rutaCritica: true,
      predecesoras: ["3"],
      responsable: "Cuadrilla Estructura & Cubierta",
      matchItem: "6.1",
    },
    {
      id: "6b",
      uid: "6b",
      wbs: "2.1b",
      nombre: "Alfajía perimetral concreto c/ cortagoteras sobre antepecho",
      capitulo: "6. CUBIERTA",
      inicio: isoOffsetDays(-3),
      fin: isoOffsetDays(-1),
      duracionDias: 2,
      pesoPct: 2,
      rutaCritica: false,
      predecesoras: ["4"],
      responsable: "Cuadrilla Mampostería",
      matchItem: "6.2",
    },
    {
      id: "6c",
      uid: "6c",
      wbs: "2.1c",
      nombre: 'Bajante aguas lluvias tubería PVC sanitaria Ø 4" + tragante',
      capitulo: "6. CUBIERTA",
      inicio: isoOffsetDays(-3),
      fin: isoOffsetDays(-1),
      duracionDias: 2,
      pesoPct: 1,
      rutaCritica: false,
      predecesoras: ["6"],
      responsable: "Cuadrilla Hidrosanitaria",
      matchItem: "6.3",
    },
    {
      id: "7",
      uid: "7",
      wbs: "2.2",
      nombre: "Pañete y mortero de revoco en muros y antepecho dos caras",
      capitulo: "2. MAMPOSTERÍA & PAÑETES",
      inicio: isoOffsetDays(-5),
      fin: isoOffsetDays(3),
      duracionDias: 8,
      pesoPct: 11,
      rutaCritica: true,
      predecesoras: ["4"],
      responsable: "Cuadrilla Pañete",
      matchItem: "2.2",
    },
    {
      id: "8",
      uid: "8",
      wbs: "2.3",
      nombre: "Porcelanato N1, N2 y Balcón (51×51 cm)",
      capitulo: "3. PISOS & ENCHAPES",
      inicio: isoOffsetDays(-3),
      fin: isoOffsetDays(6),
      duracionDias: 9,
      pesoPct: 11,
      rutaCritica: true,
      predecesoras: ["7"],
      responsable: "Cuadrilla Enchape",
      matchItem: "3.1",
    },
    {
      id: "9",
      uid: "9",
      wbs: "2.4",
      nombre: 'Cielo raso suspendido + aislamiento Frescasa 2-1/2"',
      capitulo: "4. CIELOS RASOS & FRESCASA",
      inicio: isoOffsetDays(1),
      fin: isoOffsetDays(8),
      duracionDias: 7,
      pesoPct: 6,
      rutaCritica: false,
      predecesoras: ["6"],
      responsable: "Cuadrilla Liviana",
      matchItem: "4.1",
    },
    {
      id: "10",
      uid: "10",
      wbs: "3",
      nombre: "FASE 3 — PINTURA, VENTANERÍA, BARANDAS & ENTREGA",
      capitulo: "5. CARPINTERÍA & PINTURA",
      inicio: isoOffsetDays(7),
      fin: isoOffsetDays(18),
      duracionDias: 11,
      pesoPct: 0,
      rutaCritica: true,
      esResumen: true,
    },
    {
      id: "11",
      uid: "11",
      wbs: "3.1",
      nombre: "Estuco plástico y pintura arquitectónica",
      capitulo: "5. CARPINTERÍA & PINTURA",
      inicio: isoOffsetDays(7),
      fin: isoOffsetDays(14),
      duracionDias: 7,
      pesoPct: 6,
      rutaCritica: true,
      predecesoras: ["8", "9"],
      responsable: "Cuadrilla Pintura",
      matchItem: "5.1",
    },
    {
      id: "12",
      uid: "12",
      wbs: "3.2",
      nombre: "Ventanería aluminio, puertas y barandas balcón",
      capitulo: "5. CARPINTERÍA & PINTURA",
      inicio: isoOffsetDays(11),
      fin: isoOffsetDays(17),
      duracionDias: 6,
      pesoPct: 5,
      rutaCritica: true,
      predecesoras: ["9"],
      responsable: "Cuadrilla Carpintería",
      matchItem: "5.2",
    },
    {
      id: "13",
      uid: "13",
      wbs: "3.3",
      nombre: "Milestone: BIM 5D As-Built Handover (ISO 19650)",
      capitulo: "CIERRE",
      inicio: isoOffsetDays(18),
      fin: isoOffsetDays(18),
      duracionDias: 0,
      pesoPct: 0,
      rutaCritica: true,
      esHito: true,
      predecesoras: ["11", "12"],
      responsable: "BIM Manager",
    },
  ];
}

function buildRoomsZonasBim(): RoomActivityItem[] {
  const items: RoomActivityItem[] = [];
  for (const r of PORTICO_2N_SPEC.rooms) {
    const area = round2(
      r.rects.reduce((s, [x0, z0, x1, z1]) => s + Math.abs(x1 - x0) * Math.abs(z1 - z0), 0)
    );
    const slug = r.id.toLowerCase();
    items.push({
      id: `demo_${slug}_piso`,
      room: r.name,
      activityKey: "enchape",
      activityLabel:
        r.name === "Balcón"
          ? "Porcelanato Exterior Antideslizante"
          : "Porcelanato 51x51",
      sourceComment: `${r.name} - Porcelanato`,
      unit: "m²",
      quantity: area,
    });
    if (r.level === 2 && r.name !== "Balcón" && r.name !== "Hall Nivel 2") {
      items.push({
        id: `demo_${slug}_cr`,
        room: r.name,
        activityKey: "cielorraso",
        activityLabel: "Cielo Raso + Frescasa Eco",
        sourceComment: `${r.name} - Cielo Raso`,
        unit: "m²",
        quantity: area,
      });
    }
  }
  return items;
}

export function getDemoShowcaseProject(): ProjectConfig {
  const foundM3 = round2(TAKEOFF.foundationConcreteM3 + TAKEOFF.groundSlabConcreteM3);
  return {
    id: DEMO_SHOWCASE_PROJECT_ID,
    tipo: "bim",
    nombre: "Residencial Pórtico 2N + Balcón (BIM 5D)",
    contratante: "Northbridge Capital Partners",
    cedula_cliente: "",
    contratista: "JGM ConTech Engineering Team",
    cedula_contratista: "",
    cargo_contratista: "Project Controls & BIM 5D Director",
    ubicacion: "Barranquilla / Miami / Madrid • ISO 19650 OpenBIM Demo",
    modelo_bim: "Portico_2N_Vivienda_Balcon_BIM5D.ifc (Three.js + NSR-10)",
    badge: "ISO 19650 • PÓRTICO 2N BIM 5D",
    logo: "P2N",
    firma_residente: "PROJECT DIRECTOR / LEAD ENGINEER\nJGM ConTech Showcase Platform",
    firma_interventor: "OWNER'S REPRESENTATIVE\nNorthbridge Capital Partners",
    a_def: 8.0,
    i_def: 2.0,
    u_def: 5.0,
    ant_def: 20.0,
    gar_def: 5.0,
    ppto_base: [
      {
        Item: "1.1",
        Capitulo: "1. ESTRUCTURA & CIMENTACIÓN",
        Actividad: "Concreto en zapatas, pedestales y vigas de cimentación f'c=21 MPa",
        Unidad: "m³",
        Cantidad_Contratada: foundM3,
        Precio_Unitario: 695000,
        match_keys: ["zapatas", "pedestales", "vigas de cimentacion", "cimentacion", "contrapiso"],
      },
      {
        Item: "1.2",
        Capitulo: "1. ESTRUCTURA & CIMENTACIÓN",
        Actividad: "Concreto en columnas (+5.80m), vigas VE/VCU, losa L-1, balcón y escalera f'c=24 MPa",
        Unidad: "m³",
        Cantidad_Contratada: TAKEOFF.superstructureConcreteM3,
        Precio_Unitario: 790000,
        match_keys: ["columnas", "viga aerea", "viga cubierta", "entrepiso", "losa maciza entrepiso", "balcon", "escalera", "portico"],
      },
      {
        Item: "2.1",
        Capitulo: "2. MAMPOSTERÍA & PAÑETES",
        Actividad: "Muros en mampostería bloque No. 12 (incl. antepecho cubierta h=1.00 m)",
        Unidad: "m²",
        Cantidad_Contratada: TAKEOFF.masonryAreaM2,
        Precio_Unitario: 52000,
        match_keys: ["mamposteria", "bloque", "muros", "antepecho", "parapeto"],
      },
      {
        Item: "2.2",
        Capitulo: "2. MAMPOSTERÍA & PAÑETES",
        Actividad: "Pañete y mortero de revoco en muros dos caras",
        Unidad: "m²",
        Cantidad_Contratada: TAKEOFF.plasterAreaM2,
        Precio_Unitario: 25500,
        match_keys: ["panete", "revoco"],
      },
      {
        Item: "3.1",
        Capitulo: "3. PISOS & ENCHAPES",
        Actividad: "Instalación de piso en porcelanato 51x51 cm (Pisos N1 y N2)",
        Unidad: "m²",
        Cantidad_Contratada: TAKEOFF.flooringAreaM2,
        Precio_Unitario: 66000,
        match_keys: ["porcelanato", "piso", "enchape"],
      },
      {
        Item: "4.1",
        Capitulo: "4. CIELOS RASOS & FRESCASA",
        Actividad: 'Cielo raso suspendido Drywall + Aislamiento Frescasa Eco 2-1/2" (Nivel 2)',
        Unidad: "m²",
        Cantidad_Contratada: TAKEOFF.ceilingAreaM2,
        Precio_Unitario: 56000,
        match_keys: ["cielo raso", "cielorraso", "frescasa", "aislamiento", "drywall"],
      },
      {
        Item: "5.1",
        Capitulo: "5. CARPINTERÍA & PINTURA",
        Actividad: "Estuco plástico y pintura vinílica arquitectónica en muros",
        Unidad: "m²",
        Cantidad_Contratada: TAKEOFF.wallPaintAreaM2,
        Precio_Unitario: 18500,
        match_keys: ["estuco", "pintura", "vinilica"],
      },
      {
        Item: "5.2",
        Capitulo: "5. CARPINTERÍA & PINTURA",
        Actividad: "Ventanería aluminio termoacústica, puertas y barandas balcón",
        Unidad: "und",
        Cantidad_Contratada: TAKEOFF.openingsCount + PORTICO_2N_SPEC.railings.length,
        Precio_Unitario: 445000,
        match_keys: ["ventana", "ventaneria", "puerta", "baranda"],
      },
      {
        Item: "6.1",
        Capitulo: "6. CUBIERTA",
        Actividad: "Losa cubierta concreto f'c=24 MPa e=12cm, pendiente 1% e impermeabilización",
        Unidad: "m²",
        Cantidad_Contratada: TAKEOFF.roofSlabAreaM2,
        Precio_Unitario: 148000,
        match_keys: ["losa maciza cubierta", "l-2", "pendiente 1%", "impermeabilizacion", "afine", "cubierta"],
      },
      {
        Item: "6.2",
        Capitulo: "6. CUBIERTA",
        Actividad: "Alfajía perimetral concreto f'c=21 MPa c/ cortagoteras",
        Unidad: "ml",
        Cantidad_Contratada: TAKEOFF.alfajiaLengthMl,
        Precio_Unitario: 46000,
        match_keys: ["alfajia", "alfajía", "cortagoteras", "remate"],
      },
      {
        Item: "6.3",
        Capitulo: "6. CUBIERTA",
        Actividad: 'Bajante aguas lluvias tubería PVC sanitaria Ø 4" y tragante de esquina',
        Unidad: "ml",
        Cantidad_Contratada: TAKEOFF.downspoutLengthMl,
        Precio_Unitario: 58000,
        match_keys: ["bajante", "pvc sanitario", "agua lluvia", "tragante", "pluvial"],
      },
    ],
    gantt_base: buildDemoGanttTasks(),
    zonas_bim: buildRoomsZonasBim(),
  };
}

export function getDemoBitacoraRows(): BitacoraRow[] {
  let nextId = 901;
  const rows: BitacoraRow[] = [];
  const pushShifts = (
    actividad: string,
    unidad: string,
    startOffset: number,
    dailyQtys: number[],
    desperdicio: number
  ) => {
    dailyQtys.forEach((cantidad, idx) => {
      if (cantidad <= 0) return;
      const fecha = isoOffsetDays(startOffset + idx);
      rows.push({
        id: nextId++,
        fecha,
        actividad: `[${DEMO_SHOWCASE_PROJECT_ID}] ${actividad}`,
        unidad,
        cantidad,
        desperdicio,
        created_at: `${fecha}T17:10:00Z`,
      });
    });
  };

  const foundM3 = round2(TAKEOFF.foundationConcreteM3 + TAKEOFF.groundSlabConcreteM3);
  pushShifts(
    "Concreto en zapatas, pedestales y vigas de cimentación f'c=21 MPa",
    "m³",
    -24,
    splitIntoShifts(foundM3, [0.16, 0.17, 0.16, 0.17, 0.17, 0.17]),
    2.2
  );
  pushShifts(
    "Concreto en columnas (+5.80m), vigas VE/VCU, losa L-1, balcón y escalera f'c=24 MPa",
    "m³",
    -18,
    splitIntoShifts(TAKEOFF.superstructureConcreteM3, [0.12, 0.13, 0.12, 0.13, 0.13, 0.12, 0.13, 0.12]),
    1.8
  );
  pushShifts(
    "Muros en mampostería bloque No. 12 (incl. antepecho cubierta h=1.00 m)",
    "m²",
    -10,
    splitIntoShifts(TAKEOFF.masonryAreaM2, [1, 1.05, 0.95, 1.1, 1.02, 0.98, 1.05, 1.0]),
    3.5
  );
  pushShifts(
    "Losa cubierta concreto f'c=24 MPa e=12cm, pendiente 1% e impermeabilización",
    "m²",
    -10,
    splitIntoShifts(TAKEOFF.roofSlabAreaM2, [0.35, 0.35, 0.3]),
    2.2
  );
  pushShifts(
    "Alfajía perimetral concreto f'c=21 MPa c/ cortagoteras",
    "ml",
    -3,
    splitIntoShifts(TAKEOFF.alfajiaLengthMl, [0.5, 0.5]),
    2.5
  );
  pushShifts(
    'Bajante aguas lluvias tubería PVC sanitaria Ø 4" y tragante de esquina',
    "ml",
    -3,
    [TAKEOFF.downspoutLengthMl],
    1.5
  );
  // Active ~60% progress on plaster
  const plasterDone = round2(TAKEOFF.plasterAreaM2 * 0.6);
  pushShifts(
    "Pañete y mortero de revoco en muros dos caras",
    "m²",
    -7,
    splitIntoShifts(plasterDone, [0.16, 0.18, 0.16, 0.17, 0.16, 0.17]),
    3.2
  );
  // Level 1 Sala & Comedor Porcelain completed so rooms showcase green/partial in 3D
  pushShifts(
    "Instalación de piso en porcelanato 51x51 cm (Pisos N1 y N2) [Sala]",
    "m²",
    -4,
    [5.9, 5.94],
    4.2
  );
  pushShifts(
    "Instalación de piso en porcelanato 51x51 cm (Pisos N1 y N2) [Comedor]",
    "m²",
    -2,
    [5.8, 6.04],
    4.2
  );

  return rows;
}

export function getDemoSstState(): SstProjectData {
  return {
    diasSinLti: 48,
    horasHombreAcum: 3840,
    permisos: [
      {
        id: "sst-ptar-1",
        codigo: "PTAR-P2N-001",
        fecha: isoOffsetDays(0),
        tipo: "alturas",
        frente: "Losa Cubierta RC, Antepecho h=1.00m & Alfajía — +6.80 m",
        frenteEn: "RC Roof Deck, 1.00m Parapet & Coping — Elev. +22.3 ft",
        responsable: "Cuadrilla Estructura & Impermeabilización",
        responsableEn: "Roof Deck & Waterproofing Crew",
        alturaM: 6.8,
        ptarChecklistOk: true,
        arlVerificada: true,
        estado: "vigente",
        notas: "Línea de vida certificada 22 kN, arnés cuerpo completo y baranda en antepecho +6.80 m verificados.",
        notasEn: "Certified 5,000 lb (22 kN) perimeter lifeline, full-body harness & +22.3 ft parapet edge checks.",
      },
      {
        id: "sst-ptar-2",
        codigo: "PTAR-P2N-002",
        fecha: isoOffsetDays(0),
        tipo: "electrico",
        frente: "Tablero Temporal — Cocina N1",
        frenteEn: "Temporary Power Panel — Level 1 Kitchen",
        responsable: "Técnico Eléctrico Certificado",
        responsableEn: "Licensed Site Electrician",
        ptarChecklistOk: true,
        arlVerificada: true,
        estado: "vigente",
        notas: "Bloqueo y etiquetado LOTO aplicado; prueba de ausencia de tensión con multímetro CAT III.",
        notasEn: "Lockout/Tagout (LOTO) verified; zero-energy check completed with CAT III meter.",
      },
      {
        id: "sst-ptar-3",
        codigo: "PTAR-P2N-003",
        fecha: isoOffsetDays(-1),
        tipo: "izaje",
        frente: "Bombeo Concreto Losa Cubierta L-2 & Tubería PVC 4\" Fachada Este",
        frenteEn: "RC Roof Slab L-2 Pumping & East Wall 4\" PVC Downspout Install",
        responsable: "Operador Bomba & Plomero Altura",
        responsableEn: "Pump Operator & Pipefitter",
        alturaM: 5.8,
        ptarChecklistOk: true,
        arlVerificada: true,
        estado: "pendiente",
        notas: "Pendiente verificación de vientos guía en andamio Eje 3 para anclaje bajante PVC 4\".",
        notasEn: "Pending final guy-wire & scaffold tie-off check along Grid 3 for 4\" PVC downspout.",
      },
      {
        id: "sst-ptar-4",
        codigo: "PTAR-P2N-004",
        fecha: isoOffsetDays(-16),
        tipo: "excavacion",
        frente: "Cimentación Zapatas Z-1..Z-9 y Pedestales P1..P9",
        frenteEn: "Spread Footings Z-1..Z-9 & Pedestals",
        responsable: "Cuadrilla Estructura",
        responsableEn: "Structural Concrete Crew",
        alturaM: 1.5,
        ptarChecklistOk: true,
        arlVerificada: true,
        estado: "cerrado",
        notas: "Excavación rellenada y compactada tras vaciado de zapatas y pedestales sin novedades.",
        notasEn: "Trench backfilled & compacted after footing and pedestal pour with zero findings.",
      },
    ],
    charlas: [
      {
        id: "sst-talk-1",
        fecha: isoOffsetDays(0),
        frente: "Sala / Comedor & Balcón N2",
        frenteEn: "Living/Dining & L2 Balcony",
        tema: "Control de sílice en corte de porcelanato y uso obligatorio de baranda provisional en voladizo N2",
        temaEn: "Wet-saw silica dust control & mandatory temporary guardrails along L2 balcony edge",
        instructor: "Coordinación HSE / Inspector SST",
        instructorEn: "HSE Lead / Site Safety Officer",
        asistentes: 12,
        atsCompletado: true,
      },
      {
        id: "sst-talk-2",
        fecha: isoOffsetDays(-2),
        frente: "Losa Cubierta RC — Antepecho +6.80 m & Bajante 4\"",
        frenteEn: "RC Roof Deck — +22.3 ft Parapet & 4\" Downspout",
        tema: "Vaciado seguro en losa de cubierta L-2, afine con pendiente 1% y sellado impermeable",
        temaEn: "Safe L-2 roof slab placement, 1% sloped screed screeding & elastomer curing PPE",
        instructor: "Coordinación HSE / Inspector SST",
        instructorEn: "HSE Lead / Site Safety Officer",
        asistentes: 8,
        atsCompletado: true,
      },
    ],
    eppTrabajadores: [
      {
        id: "sst-w-1",
        codigo: "P2N-01",
        rol: "Líder Estructuras y Concreto",
        rolEn: "Structural Concrete Lead Tech",
        cuadrilla: "Cuadrilla Estructura",
        cargoCertAltura: true,
        venceCertAltura: isoOffsetDays(180),
        estadoAfiliacion: "activa",
        casco: true,
        botas: true,
        arnes: true,
        guantes: true,
        gafas: true,
      },
      {
        id: "sst-w-2",
        codigo: "P2N-02",
        rol: 'Oficial Impermeabilización & Plomería PVC 4"',
        rolEn: 'Roof Waterproofing & 4" PVC Pipefitter',
        cuadrilla: "Cuadrilla Estructura & Cubierta",
        cargoCertAltura: true,
        venceCertAltura: isoOffsetDays(95),
        estadoAfiliacion: "activa",
        casco: true,
        botas: true,
        arnes: true,
        guantes: true,
        gafas: true,
      },
      {
        id: "sst-w-3",
        codigo: "P2N-03",
        rol: "Oficial Mampostería Bloque No. 12",
        rolEn: "CMU No. 12 Masonry Lead",
        cuadrilla: "Cuadrilla Mampostería",
        cargoCertAltura: true,
        venceCertAltura: isoOffsetDays(210),
        estadoAfiliacion: "activa",
        casco: true,
        botas: true,
        arnes: true,
        guantes: true,
        gafas: true,
      },
    ],
    incidentes: [
      {
        id: "sst-inc-1",
        fecha: isoOffsetDays(-1),
        tipo: "condicion_insegura",
        frente: "Borde Balcón Voladizo +3.00 m",
        frenteEn: "Cantilever Balcony Edge (+9.8 ft)",
        descripcion: "Cable de seguridad provisional con flecha excesiva en tramo de baranda Eje 2-3.",
        descripcionEn: "Temporary perimeter safety wire slack between Grid 2 and Grid 3.",
        accionCapa: "Tensar guaya 3/8\" con grilletes y señalizar zona hasta instalar baranda definitiva.",
        accionCapaEn: "Re-tension 3/8\" safety cable with turnbuckle until permanent railing install.",
        responsable: "Inspector SST / Carpintería",
        fechaLimite: isoOffsetDays(1),
        cerrado: false,
      },
    ],
  };
}

export function getDemoPayrollState(data: ConsolidationResult): PayrollProjectData {
  const findQty = (itemCode: string, fallback: number): number => {
    const match = data.df_5d.find((r) => String(r.Item) === itemCode);
    return match ? Number(match.Cantidad_Ejecutada || 0) : fallback;
  };

  return {
    periodo: isoOffsetDays(-14).slice(0, 7) + " Q1",
    registros: [
      {
        id: "pay-p2n-1",
        codigo: "EMP-01",
        nombreRol: "Dirección Residente de Obra",
        nombreRolEn: "Resident Civil Engineer",
        especialidad: "Control Estructural NSR-10 & BIM 5D",
        especialidadEn: "RC Frame Controls & BIM 5D",
        modalidad: "jornal",
        unidadPago: "día",
        tarifaBaseCop: 165000,
        diasTrabajados: 12,
        horasExtra: 4,
        cantidadDestajoMetric: 0,
        prestamoDescuentoCop: 0,
        afiliadoArlRiesgoV: true,
        estado: "aprobada",
        notas: "Liberación de acero en losa entrepiso, balcón en voladizo y escalera ESC-1.",
      },
      {
        id: "pay-p2n-2",
        codigo: "CREW-21",
        nombreRol: "Cuadrilla Mampostería (1 Of + 1 Ayud)",
        nombreRolEn: "CMU Masonry Crew (1 Lead + 1 Helper)",
        especialidad: "Muros bloque concreto No. 12 (N1+N2)",
        especialidadEn: "CMU No. 12 Walls (Levels 1 & 2)",
        modalidad: "destajo",
        unidadPago: "m²",
        tarifaBaseCop: 22000,
        diasTrabajados: 8,
        horasExtra: 0,
        cantidadDestajoMetric: findQty("2.1", TAKEOFF.masonryAreaM2),
        actividadMatchItem: "2.1",
        prestamoDescuentoCop: 120000,
        afiliadoArlRiesgoV: true,
        estado: "aprobada",
        notas: "Corte medido contra modelo 3D Pórtico 2N.",
      },
      {
        id: "pay-p2n-3",
        codigo: "CREW-22",
        nombreRol: "Cuadrilla Pañete & Revoco (1 Of + 1 Ayud)",
        nombreRolEn: "Plastering Crew (1 Lead + 1 Helper)",
        especialidad: "Pañete y mortero dos caras",
        especialidadEn: "Two-Sided Cement Stucco Screeding",
        modalidad: "destajo",
        unidadPago: "m²",
        tarifaBaseCop: 14500,
        diasTrabajados: 6,
        horasExtra: 0,
        cantidadDestajoMetric: findQty("2.2", round2(TAKEOFF.plasterAreaM2 * 0.6)),
        actividadMatchItem: "2.2",
        prestamoDescuentoCop: 0,
        afiliadoArlRiesgoV: true,
        estado: "borrador",
        notas: "Avance activo en muros Nivel 1.",
      },
      {
        id: "pay-p2n-4",
        codigo: "CREW-61",
        nombreRol: "Cuadrilla Losa Cubierta RC, Afine 1% & Plomería PVC",
        nombreRolEn: "RC Roof Deck, 1% Screed & 4\" Drain Crew",
        especialidad: "Losa L-2 + Pendiente 1% + Alfajía + Bajante 4\"",
        especialidadEn: "Slab L-2 + 1% Drainage Screed + Coping + 4\" PVC Downspout",
        modalidad: "destajo",
        unidadPago: "m²",
        tarifaBaseCop: 34000,
        diasTrabajados: 4,
        horasExtra: 0,
        cantidadDestajoMetric: findQty("6.1", TAKEOFF.roofSlabAreaM2),
        actividadMatchItem: "6.1",
        prestamoDescuentoCop: 0,
        afiliadoArlRiesgoV: true,
        estado: "aprobada",
        notas: "Losa L-2 vaciada, afine 1% hacia tragante Eje A/3, alfajía y bajante PVC 4\" ejecutados.",
      },
    ],
  };
}

export function getDemoSuppliersState(): SuppliersProjectData {
  const totalConcrete = TAKEOFF.totalConcreteM3;
  return {
    proveedores: [
      {
        id: "sup-p2n-1",
        codigo: "PROV-01",
        razonSocial: "Northbridge Ready-Mix & Precast",
        razonSocialEn: "Northbridge Ready-Mix & Precast",
        nitTaxId: "TAX-900-412-001",
        categoria: "concreto",
        especialidad: "Concreto Premezclado f'c 21 / 24 MPa + Bombeo",
        especialidadEn: "Ready-Mix Concrete 3,000 / 3,500 PSI & Pump",
        contactoRol: "Despacho Planta Central",
        condicionPago: "Crédito 15 días",
        condicionPagoEn: "Net 15",
        calificacion: 4.9,
        retencionPct: 2.5,
      },
      {
        id: "sup-p2n-2",
        codigo: "PROV-02",
        razonSocial: "Aceros & Bloques Estructurales S.A.",
        razonSocialEn: "Andina Structural Steel & CMU Supply",
        nitTaxId: "TAX-900-518-044",
        categoria: "aceros_mamposteria",
        especialidad: "Bloque No. 12 (N1–N2 + Antepecho) y Acero PDR-60 NTC 2289",
        especialidadEn: "CMU No. 12 Blocks (L1–L2 + Parapet) & Grade 60 Rebar",
        contactoRol: "Asesor Comercial Mayorista",
        condicionPago: "Crédito 30 días",
        condicionPagoEn: "Net 30",
        calificacion: 4.8,
        retencionPct: 2.5,
      },
      {
        id: "sup-p2n-3",
        codigo: "PROV-03",
        razonSocial: "Impermeabilizantes, PVC & Aluminio S.A.S.",
        razonSocialEn: "Waterproofing Systems, PVC & Architectural Aluminum",
        nitTaxId: "TAX-901-203-774",
        categoria: "cubierta_carpinteria",
        especialidad: "Membrana Elastomérica, Tubería PVC Sanitaria 4\" & Ventanería",
        especialidadEn: "Elastomeric Roof Membrane, 4\" Sanitary PVC Pipe & Glazing",
        contactoRol: "Ingeniería de Envolvente",
        condicionPago: "50% Anticipo / 50% Entrega",
        condicionPagoEn: "50% Deposit / 50% Delivery",
        calificacion: 4.8,
        retencionPct: 4.0,
      },
    ],
    ordenes: [
      {
        id: "oc-p2n-101",
        codigo: "OC-P2N-101",
        fecha: isoOffsetDays(-22),
        fechaEntrega: isoOffsetDays(-10),
        proveedorId: "sup-p2n-1",
        proveedorNombre: "Northbridge Ready-Mix & Precast",
        concepto: "Concreto Premezclado Cimentación, Columnas, Vigas, Losas L-1/L-2 y Alfajía",
        conceptoEn: "Ready-Mix Concrete Footings, Frame, Slabs L-1/L-2 & Coping (3,000/3,500 PSI)",
        unidad: "m³",
        cantidad: totalConcrete,
        precioUnitarioCop: 530000,
        bimMaterialMatch: "Concreto Premezclado",
        porcentajeRecibido: 100,
        pagadoCop: Math.round(totalConcrete * 530000),
        estado: "pagada",
        notas: "100% verificado con ensayos ASTM C39 incl. losa de cubierta L-2.",
      },
      {
        id: "oc-p2n-102",
        codigo: "OC-P2N-102",
        fecha: isoOffsetDays(-14),
        fechaEntrega: isoOffsetDays(-6),
        proveedorId: "sup-p2n-2",
        proveedorNombre: "Aceros & Bloques Estructurales S.A.",
        concepto: "Bloque Concreto No. 12 (Muros N1–N2 y Antepecho h=1.00 m)",
        conceptoEn: "CMU No. 12 Masonry Units (Walls + 1.00m Parapet)",
        unidad: "m²",
        cantidad: TAKEOFF.masonryAreaM2,
        precioUnitarioCop: 43000,
        bimMaterialMatch: "Bloque de Concreto No. 12",
        porcentajeRecibido: 100,
        pagadoCop: Math.round(TAKEOFF.masonryAreaM2 * 43000 * 0.5),
        estado: "recibida",
        notas: "Bloques para cerramiento N1–N2 y antepecho perimetral recibidos completos.",
      },
      {
        id: "oc-p2n-103",
        codigo: "OC-P2N-103",
        fecha: isoOffsetDays(-10),
        fechaEntrega: isoOffsetDays(-3),
        proveedorId: "sup-p2n-3",
        proveedorNombre: "Impermeabilizantes, PVC & Aluminio S.A.S.",
        concepto: "Membrana Impermeabilizante Elastomérica + Tubería PVC Sanitaria Ø 4\" & Tragante",
        conceptoEn: "Elastomeric Roof Waterproofing Membrane + 4\" Sanitary PVC Pipe & Drain",
        unidad: "m²",
        cantidad: TAKEOFF.roofSlabAreaM2,
        precioUnitarioCop: 42000,
        bimMaterialMatch: "Impermeabilización",
        porcentajeRecibido: 100,
        pagadoCop: Math.round(TAKEOFF.roofSlabAreaM2 * 42000),
        estado: "pagada",
        notas: "Sistema impermeable sobre pendiente 1% y bajante PVC 4\" instalados al 100%.",
      },
    ],
  };
}

export function getDemoClientsState(
  proyecto: ProjectConfig,
  data: ConsolidationResult,
  params: LiquidationParams
): ClientsProjectData {
  const pctAiu = (params.pct_a + params.pct_i + params.pct_u) / 100;
  const valorContrato = Math.round(data.totals.total_ppto_contratado * (1 + pctAiu));
  const ejecutadoBruto = Math.round(data.totals.total_costo_ejecutado * (1 + pctAiu));
  const pctAnt = params.pct_anticipo / 100;
  const pctGar = params.pct_garantia / 100;
  const pctIvaSobreU = (params.pct_u / 100) * 0.19;

  const anticipoBruto = Math.round(valorContrato * (pctAnt > 0 ? pctAnt : 0.2));
  const acta1Bruto = Math.max(12000000, Math.round(ejecutadoBruto * 0.55));
  const acta1Ant = Math.round(acta1Bruto * pctAnt);
  const acta1Gar = Math.round(acta1Bruto * pctGar);
  const acta1Iva = Math.round((acta1Bruto / (1 + pctAiu)) * pctIvaSobreU);
  const acta1Neto = acta1Bruto - acta1Ant - acta1Gar + acta1Iva;

  const acta2Bruto = Math.max(6000000, Math.round(ejecutadoBruto * 0.35));
  const acta2Ant = Math.round(acta2Bruto * pctAnt);
  const acta2Gar = Math.round(acta2Bruto * pctGar);
  const acta2Iva = Math.round((acta2Bruto / (1 + pctAiu)) * pctIvaSobreU);

  return {
    clienteNombre: proyecto.contratante || "Northbridge Capital Partners",
    clienteIdFiscal: "ENTITY-US-CO-901884210",
    representanteRol: "Gerencia de Inversión & Interventoría",
    representanteRolEn: "Capital Investment & Owner's Rep",
    condicionCobro: "Actas Quincenales • Pago 15 días radicación",
    condicionCobroEn: "Bi-weekly Progress Certificates • Net 15",
    cupoAprobadoCop: Math.round(valorContrato * 1.15),
    facturas: [
      {
        id: "cli-p2n-1",
        numero: "ANT-P2N-001",
        fechaEmision: isoOffsetDays(-24),
        fechaVencimiento: isoOffsetDays(-19),
        tipo: "anticipo",
        concepto: "Anticipo Contractual Inicial (Pórtico 2N BIM 5D)",
        conceptoEn: "Contract Mobilization Advance Payment (BIM 5D Kickoff)",
        valorBrutoCop: anticipoBruto,
        amortizacionAnticipoCop: 0,
        retencionGarantiaCop: 0,
        ivaCop: 0,
        recaudadoCop: anticipoBruto,
        estado: "pagada",
        notas: "Desembolso completo contra póliza de buen manejo de anticipo.",
      },
      {
        id: "cli-p2n-2",
        numero: "ACTA-P2N-001",
        fechaEmision: isoOffsetDays(-10),
        fechaVencimiento: isoOffsetDays(-2),
        tipo: "acta_avance",
        concepto: "Acta #1 — Cimentación, Pórtico 2N, Losa L-1/L-2, Pendiente 1% & Bajante 4\"",
        conceptoEn: "Certificate #1 — Foundations, 2S Frame, Slabs L-1/L-2, 1% Slope & 4\" Drain",
        valorBrutoCop: acta1Bruto,
        amortizacionAnticipoCop: acta1Ant,
        retencionGarantiaCop: acta1Gar,
        ivaCop: acta1Iva,
        recaudadoCop: acta1Neto,
        estado: "pagada",
        notas: "Aprobada por Interventoría contra corte físico 3D/Bitácora.",
      },
      {
        id: "cli-p2n-3",
        numero: "ACTA-P2N-002",
        fechaEmision: isoOffsetDays(-1),
        fechaVencimiento: isoOffsetDays(14),
        tipo: "acta_avance",
        concepto: "Acta #2 — Mampostería Bloque N° 12, Pañetes & Porcelanato N1",
        conceptoEn: "Certificate #2 — CMU No. 12 Masonry, Stucco & L1 Flooring",
        valorBrutoCop: acta2Bruto,
        amortizacionAnticipoCop: acta2Ant,
        retencionGarantiaCop: acta2Gar,
        ivaCop: acta2Iva,
        recaudadoCop: 0,
        estado: "radicada",
        notas: "Radicada para aprobación y desembolso dentro de 15 días.",
      },
    ],
  };
}

/**
 * Genera el gemelo digital 3D paramétrico Pórtico 2 Niveles con balcón, escalera,
 * losa de cubierta en concreto armado con pendiente 1%, antepecho N°12, alfajía y bajante PVC 4"
 * directamente desde portico2n.spec.json.
 */
export function buildShowcaseIfcModel(
  projectName = "Residencial Pórtico 2N",
  lang: "es" | "en" = "es"
): ParsedIfcModel {
  return buildPortico2nIfcModel(projectName, lang);
}
