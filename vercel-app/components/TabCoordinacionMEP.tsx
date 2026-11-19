"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  AlertOctagon,
  AlertTriangle,
  BookCheck,
  Box,
  CheckCircle2,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  FileSpreadsheet,
  Flame,
  Focus,
  Layers,
  Play,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import { useAppPreferences } from "../lib/i18n";
import { buildPortico2nIfcModel } from "../lib/portico2n/modelBuilder";
import {
  buildBcfJsonReport,
  buildClashCsvReport,
  buildMepPartGeometry,
  buildNavisworksXmlReport,
  DetectedClash,
  getActiveMepParts,
  getPortico2nStructuralTargets,
  ImportedNavisworksClash,
  MepDiscipline,
  MepFixtureDef,
  NORMATIVE_STANDARDS_CATALOG,
  parseNavisworksXmlReport,
  PORTICO_2N_FIXTURES,
  PORTICO_2N_MEP_ELEMENTS,
  runMepClashDetection,
} from "../lib/portico2n/mepEngine";
import { ProjectConfig } from "../lib/types";

interface TabCoordinacionMEPProps {
  proyecto: ProjectConfig;
  isDemo?: boolean;
}

type StrDisplayMode = "xray" | "solid" | "hidden";
type ArqDisplayMode = "hidden" | "ghost" | "solid";
type ClashFilter = "all" | "str_mep" | "mep_mep" | "active" | "resolved";
type CatalogView = "standards" | "fixtures";

const STRUCTURAL_TYPES = new Set(["IFCFOOTING", "IFCCOLUMN", "IFCBEAM", "IFCSLAB", "IFCSTAIR"]);

interface CameraAnimTarget {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  progress: number;
}

function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function TabCoordinacionMEP({
  proyecto,
  isDemo = false,
}: TabCoordinacionMEPProps) {
  const { lang, formatMoney } = useAppPreferences();
  const isEn = lang === "en";
  const L = useCallback((es: string, en: string) => (isEn ? en : es), [isEn]);

  // Coordination & Clash Detective state
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [reviewIds, setReviewIds] = useState<Set<string>>(() => new Set());
  const [toleranceMm, setToleranceMm] = useState<number>(0);
  const [selectedClashId, setSelectedClashId] = useState<string | null>("CLH-001");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<ClashFilter>("all");
  const [catalogView, setCatalogView] = useState<CatalogView>("standards");
  const [fixtureDisciplineFilter, setFixtureDisciplineFilter] = useState<MepDiscipline | "ALL">("ALL");
  const [scanPulse, setScanPulse] = useState<boolean>(false);
  const [lastScanAt, setLastScanAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  // Selection Tree visibility toggles (Navisworks Selection Tree style)
  const [strMode, setStrMode] = useState<StrDisplayMode>("xray");
  const [arqMode, setArqMode] = useState<ArqDisplayMode>("hidden");
  const [visibleMep, setVisibleMep] = useState<Record<MepDiscipline, boolean>>({
    HVAC: true,
    PLU: true,
    ELEC: true,
    GAS: true,
    PCI: true,
  });
  const [showFixtures, setShowFixtures] = useState<boolean>(true);
  const [showClashMarkers, setShowClashMarkers] = useState<boolean>(true);
  const [dimOthersOnFocus, setDimOthersOnFocus] = useState<boolean>(true);

  // External Navisworks XML import state
  const xmlInputRef = useRef<HTMLInputElement | null>(null);
  const [importedXmlClashes, setImportedXmlClashes] = useState<ImportedNavisworksClash[]>([]);
  const [importedXmlFile, setImportedXmlFile] = useState<string | null>(null);
  const [xmlError, setXmlError] = useState<string | null>(null);

  // Three.js refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const strGroupRef = useRef<THREE.Group | null>(null);
  const arqGroupRef = useRef<THREE.Group | null>(null);
  const mepGroupRef = useRef<THREE.Group | null>(null);
  const fixtureGroupRef = useRef<THREE.Group | null>(null);
  const markerGroupRef = useRef<THREE.Group | null>(null);
  const animTargetRef = useRef<CameraAnimTarget | null>(null);
  const markerMeshesRef = useRef<THREE.Mesh[]>([]);
  const strMeshIndexRef = useRef<Map<string, THREE.Mesh[]>>(new Map());
  const mepMeshIndexRef = useRef<Map<string, THREE.Mesh[]>>(new Map());
  const fixtureMeshIndexRef = useRef<Map<string, THREE.Mesh[]>>(new Map());

  // Live geometric 3D clash detection
  const clashes = useMemo(
    () =>
      runMepClashDetection({
        resolvedRuleIds: resolvedIds,
        reviewRuleIds: reviewIds,
        toleranceMm,
      }),
    [resolvedIds, reviewIds, toleranceMm]
  );

  const selectedClash = useMemo(
    () => clashes.find((c) => c.id === selectedClashId) || null,
    [clashes, selectedClashId]
  );

  const filteredClashes = useMemo(() => {
    return clashes.filter((c) => {
      if (filterMode === "str_mep") return c.testSet === "STR vs. MEP";
      if (filterMode === "mep_mep") return c.testSet === "MEP vs. MEP";
      if (filterMode === "active") return c.status !== "resolved";
      if (filterMode === "resolved") return c.status === "resolved";
      return true;
    });
  }, [clashes, filterMode]);

  const filteredFixtures = useMemo(() => {
    if (fixtureDisciplineFilter === "ALL") return PORTICO_2N_FIXTURES;
    return PORTICO_2N_FIXTURES.filter((f) => f.discipline === fixtureDisciplineFilter);
  }, [fixtureDisciplineFilter]);

  const stats = useMemo(() => {
    const total = clashes.length;
    const active = clashes.filter((c) => c.status !== "resolved").length;
    const resolved = clashes.filter((c) => c.status === "resolved").length;
    const criticalOpen = clashes.filter(
      (c) => c.status !== "resolved" && c.severity === "critical"
    ).length;
    const mepVsMepOpen = clashes.filter(
      (c) => c.status !== "resolved" && c.testSet === "MEP vs. MEP"
    ).length;
    const maxPenMm = clashes.reduce(
      (acc, c) => (c.status !== "resolved" ? Math.max(acc, c.penetrationMm) : acc),
      0
    );
    const totalPotentialSavings = clashes.reduce((acc, c) => acc + c.reworkSavingsCop, 0);
    const realizedSavings = clashes
      .filter((c) => c.status === "resolved")
      .reduce((acc, c) => acc + c.reworkSavingsCop, 0);
    const pctCoordinated = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return {
      total,
      active,
      resolved,
      criticalOpen,
      mepVsMepOpen,
      maxPenMm,
      totalPotentialSavings,
      realizedSavings,
      pctCoordinated,
    };
  }, [clashes]);

  const flyCameraTo = useCallback(
    (pos: [number, number, number], target: [number, number, number]) => {
      animTargetRef.current = {
        pos: new THREE.Vector3(...pos),
        target: new THREE.Vector3(...target),
        progress: 0,
      };
    },
    []
  );

  const focusOnClash = useCallback(
    (clash: DetectedClash) => {
      const [x, y, z] = clash.point;
      const offsetX = x >= 0 ? 2.4 : -2.4;
      const offsetZ = z >= 0 ? 2.5 : -2.5;
      flyCameraTo([x + offsetX, Math.min(7.8, y + 1.35), z + offsetZ], [x, y, z]);
    },
    [flyCameraTo]
  );

  const focusOnFixture = useCallback(
    (fixture: MepFixtureDef) => {
      setSelectedClashId(null);
      setSelectedFixtureId(fixture.id);
      setShowFixtures(true);
      setVisibleMep((prev) => ({ ...prev, [fixture.discipline]: true }));
      flyCameraTo(fixture.cameraPos, fixture.focusPoint);
    },
    [flyCameraTo]
  );

  // Initialize Three.js WebGL scene + static PORTICO-2N STR/ARQ + Fixtures meshes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    sceneRef.current = scene;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 120);
    camera.position.set(8.6, 6.4, 9.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 2.8, 0);
    controls.minDistance = 1.1;
    controls.maxDistance = 30;
    controls.update();
    controlsRef.current = controls;

    const stopAnim = () => {
      animTargetRef.current = null;
    };
    controls.addEventListener("start", stopAnim);

    // Engineering studio lighting
    scene.add(new THREE.AmbientLight(0xdbeafe, 0.78));
    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.58));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.08);
    keyLight.position.set(11, 16, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.48);
    fillLight.position.set(-10, 7, -9);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(18, 18, 0x334155, 0x1e293b);
    grid.position.y = -0.02;
    scene.add(grid);

    const strGroup = new THREE.Group();
    const arqGroup = new THREE.Group();
    const mepGroup = new THREE.Group();
    const fixtureGroup = new THREE.Group();
    const markerGroup = new THREE.Group();
    scene.add(strGroup, arqGroup, mepGroup, fixtureGroup, markerGroup);
    strGroupRef.current = strGroup;
    arqGroupRef.current = arqGroup;
    mepGroupRef.current = mepGroup;
    fixtureGroupRef.current = fixtureGroup;
    markerGroupRef.current = markerGroup;

    // 1. Build base PORTICO-2N structural + architectural meshes
    const model = buildPortico2nIfcModel(proyecto.nombre, lang);
    const strTargets = getPortico2nStructuralTargets();
    const strIndex = new Map<string, THREE.Mesh[]>();

    for (const el of model.elements) {
      if (el.meta.ifcType === "IFCPIPESEGMENT") continue;
      const isStr = STRUCTURAL_TYPES.has(el.meta.ifcType);

      let matchedTargetId: string | null = null;
      if (isStr) {
        for (const t of strTargets) {
          const rx = new RegExp(`\\b${t.id}\\b`);
          if (rx.test(el.meta.name)) {
            matchedTargetId = t.id;
            break;
          }
        }
      }

      for (const part of el.parts) {
        if (part.isRebar) continue;
        const mat = new THREE.MeshStandardMaterial({
          color: isStr ? 0x94a3b8 : part.originalColor,
          roughness: 0.72,
          metalness: 0.08,
          transparent: true,
          opacity: isStr ? 0.22 : 0.14,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(part.geometry, mat);
        mesh.userData = {
          baseColor: isStr ? 0x94a3b8 : part.originalColor.getHex(),
          targetId: matchedTargetId,
          ifcType: el.meta.ifcType,
        };
        if (isStr) {
          strGroup.add(mesh);
          if (matchedTargetId) {
            const arr = strIndex.get(matchedTargetId) || [];
            arr.push(mesh);
            strIndex.set(matchedTargetId, arr);
          }
        } else {
          arqGroup.add(mesh);
        }
      }
    }
    strMeshIndexRef.current = strIndex;

    // 2. Build 3D Fixtures (Sanitaryware, Kitchen, GFCI, RETILAP LEDs, HVAC Diffusers, Gas & PCI)
    const fixIndex = new Map<string, THREE.Mesh[]>();
    const fixGeomsToDispose: THREE.BufferGeometry[] = [];
    for (const fix of PORTICO_2N_FIXTURES) {
      const meshes: THREE.Mesh[] = [];
      for (const part of fix.parts) {
        const geom = buildMepPartGeometry(part);
        fixGeomsToDispose.push(geom);
        const baseColor = part.colorOverride ?? fix.color;
        const baseOpacity = part.opacity ?? 1.0;
        const baseEmissive = part.emissive ?? 0x000000;
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.35,
          metalness: 0.2,
          emissive: baseEmissive,
          emissiveIntensity: baseEmissive ? 0.65 : 0,
          transparent: baseOpacity < 0.99,
          opacity: baseOpacity,
          depthWrite: baseOpacity >= 0.99,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.userData = {
          fixtureId: fix.id,
          discipline: fix.discipline,
          baseColor,
          baseOpacity,
          baseEmissive,
        };
        fixtureGroup.add(mesh);
        meshes.push(mesh);
      }
      fixIndex.set(fix.id, meshes);
    }
    fixtureMeshIndexRef.current = fixIndex;

    const ro = new ResizeObserver(() => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    });
    ro.observe(container);

    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (animTargetRef.current && cameraRef.current && controlsRef.current) {
        const anim = animTargetRef.current;
        anim.progress = Math.min(1, anim.progress + 0.065);
        cameraRef.current.position.lerp(anim.pos, 0.14);
        controlsRef.current.target.lerp(anim.target, 0.14);
        if (
          cameraRef.current.position.distanceTo(anim.pos) < 0.04 &&
          controlsRef.current.target.distanceTo(anim.target) < 0.04
        ) {
          animTargetRef.current = null;
        }
      }

      const scale = 1 + Math.sin(t * 4.2) * 0.14;
      for (const m of markerMeshesRef.current) {
        if (m.userData?.pulse) {
          m.scale.setScalar(scale);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.removeEventListener("start", stopAnim);
      controls.dispose();
      for (const el of model.elements) {
        for (const p of el.parts) p.geometry.dispose();
      }
      for (const g of fixGeomsToDispose) g.dispose();
      renderer.dispose();
    };
  }, [proyecto.nombre, lang]);

  // Rebuild 3D MEP distribution meshes whenever resolvedIds changes
  useEffect(() => {
    const mepGroup = mepGroupRef.current;
    if (!mepGroup) return;

    while (mepGroup.children.length > 0) {
      const child = mepGroup.children[0] as THREE.Mesh;
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
      mepGroup.remove(child);
    }

    const index = new Map<string, THREE.Mesh[]>();

    for (const el of PORTICO_2N_MEP_ELEMENTS) {
      const activeParts = getActiveMepParts(el, resolvedIds);
      const meshes: THREE.Mesh[] = [];

      for (const part of activeParts) {
        const geom = buildMepPartGeometry(part);
        const mat = new THREE.MeshStandardMaterial({
          color: part.colorOverride ?? el.color,
          roughness: el.discipline === "HVAC" ? 0.35 : 0.42,
          metalness: el.discipline === "HVAC" ? 0.52 : 0.2,
          transparent: false,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.userData = {
          mepId: el.id,
          discipline: el.discipline,
          baseColor: part.colorOverride ?? el.color,
        };
        mepGroup.add(mesh);
        meshes.push(mesh);
      }

      index.set(el.id, meshes);
    }

    mepMeshIndexRef.current = index;
  }, [resolvedIds]);

  // Sync visibility, X-Ray mode, fixture focus & Navisworks Red/Green clash highlighting
  useEffect(() => {
    const strGroup = strGroupRef.current;
    const arqGroup = arqGroupRef.current;
    const mepGroup = mepGroupRef.current;
    const fixtureGroup = fixtureGroupRef.current;
    const markerGroup = markerGroupRef.current;
    if (!strGroup || !arqGroup || !mepGroup || !fixtureGroup || !markerGroup) return;

    const focusA = selectedClash?.elementAId || null;
    const focusB = selectedClash?.elementBId || null;
    const isFocusingClash = Boolean(selectedClash && dimOthersOnFocus);

    // 1. Structural visibility
    strGroup.visible = strMode !== "hidden";
    for (const child of strGroup.children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const tId = mesh.userData?.targetId as string | null;
      const isFocusedA = Boolean(focusA && tId === focusA);

      if (isFocusedA) {
        mat.color.setHex(selectedClash?.status === "resolved" ? 0x10b981 : 0xef4444);
        mat.emissive.setHex(selectedClash?.status === "resolved" ? 0x065f46 : 0x991b1b);
        mat.emissiveIntensity = 0.45;
        mat.opacity = 0.88;
        mat.transparent = true;
        mat.depthWrite = true;
      } else {
        mat.color.setHex(mesh.userData?.baseColor || 0x94a3b8);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
        if (strMode === "solid" && !isFocusingClash) {
          mat.opacity = 0.92;
          mat.transparent = false;
          mat.depthWrite = true;
        } else {
          mat.opacity = isFocusingClash ? 0.09 : 0.22;
          mat.transparent = true;
          mat.depthWrite = false;
        }
      }
      mat.needsUpdate = true;
    }

    // 2. Architectural visibility
    arqGroup.visible = arqMode !== "hidden";
    for (const child of arqGroup.children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (arqMode === "solid" && !isFocusingClash) {
        mat.opacity = 0.85;
        mat.transparent = true;
        mat.depthWrite = true;
      } else {
        mat.opacity = isFocusingClash ? 0.05 : 0.14;
        mat.transparent = true;
        mat.depthWrite = false;
      }
      mat.needsUpdate = true;
    }

    // 3. MEP networks visibility + clash highlighting
    for (const [mepId, meshes] of Array.from(mepMeshIndexRef.current.entries())) {
      for (const mesh of meshes) {
        const disc = mesh.userData.discipline as MepDiscipline;
        mesh.visible = visibleMep[disc];
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const isA = focusA === mepId;
        const isB = focusB === mepId;

        if (isA || isB) {
          const resolved = selectedClash?.status === "resolved";
          const col = resolved ? 0x10b981 : isA ? 0xef4444 : 0x22c55e;
          mat.color.setHex(col);
          mat.emissive.setHex(col);
          mat.emissiveIntensity = 0.4;
          mat.opacity = 1.0;
          mat.transparent = false;
          mat.depthWrite = true;
          mesh.visible = true;
        } else {
          mat.color.setHex(mesh.userData.baseColor);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          if (isFocusingClash) {
            mat.opacity = 0.22;
            mat.transparent = true;
            mat.depthWrite = false;
          } else {
            mat.opacity = 1.0;
            mat.transparent = false;
            mat.depthWrite = true;
          }
        }
        mat.needsUpdate = true;
      }
    }

    // 4. Fixtures visibility + soft dimming during clash isolation + glow when selected
    fixtureGroup.visible = showFixtures;
    for (const [fixId, meshes] of Array.from(fixtureMeshIndexRef.current.entries())) {
      const isFocusedFixture = selectedFixtureId === fixId;
      for (const mesh of meshes) {
        const disc = mesh.userData.discipline as MepDiscipline;
        mesh.visible = showFixtures && visibleMep[disc];
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const baseOp = mesh.userData.baseOpacity as number;
        const baseEm = mesh.userData.baseEmissive as number;

        if (isFocusedFixture) {
          mat.color.setHex(mesh.userData.baseColor);
          mat.emissive.setHex(0x38bdf8);
          mat.emissiveIntensity = 0.55;
          mat.opacity = Math.max(0.7, baseOp);
          mat.transparent = baseOp < 0.99;
          mat.depthWrite = baseOp >= 0.99;
        } else if (isFocusingClash) {
          mat.color.setHex(mesh.userData.baseColor);
          mat.emissive.setHex(baseEm);
          mat.emissiveIntensity = baseEm ? 0.2 : 0;
          mat.opacity = Math.min(baseOp, 0.22);
          mat.transparent = true;
          mat.depthWrite = false;
        } else {
          mat.color.setHex(mesh.userData.baseColor);
          mat.emissive.setHex(baseEm);
          mat.emissiveIntensity = baseEm ? 0.65 : 0;
          mat.opacity = baseOp;
          mat.transparent = baseOp < 0.99;
          mat.depthWrite = baseOp >= 0.99;
        }
        mat.needsUpdate = true;
      }
    }

    // 5. Rebuild 3D Clash Markers
    while (markerGroup.children.length > 0) {
      const obj = markerGroup.children[0] as THREE.Mesh;
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material?.dispose();
      }
      markerGroup.remove(obj);
    }
    markerMeshesRef.current = [];
    markerGroup.visible = showClashMarkers;

    if (showClashMarkers) {
      for (const c of clashes) {
        const isSelected = c.id === selectedClashId;
        const isResolved = c.status === "resolved";
        const [px, py, pz] = c.point;

        const radius = isSelected ? 0.27 : 0.18;
        const sphereColor = isResolved
          ? 0x10b981
          : c.severity === "critical"
          ? 0xef4444
          : 0xf59e0b;

        const sphereGeo = new THREE.SphereGeometry(radius, 20, 20);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: sphereColor,
          transparent: true,
          opacity: isResolved ? (isSelected ? 0.35 : 0.14) : isSelected ? 0.55 : 0.34,
          depthWrite: false,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(px, py, pz);
        sphere.userData = { pulse: !isResolved };
        markerGroup.add(sphere);
        markerMeshesRef.current.push(sphere);

        const coreGeo = new THREE.SphereGeometry(isSelected ? 0.075 : 0.05, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(px, py, pz);
        markerGroup.add(core);

        if (isSelected && !isResolved) {
          const [sx, sy, sz] = c.overlapSize;
          const boxGeo = new THREE.BoxGeometry(
            Math.max(0.24, sx + 0.08),
            Math.max(0.24, sy + 0.08),
            Math.max(0.24, sz + 0.08)
          );
          const edges = new THREE.EdgesGeometry(boxGeo);
          boxGeo.dispose();
          const lineMat = new THREE.LineBasicMaterial({ color: 0xfef08a });
          const wire = new THREE.LineSegments(edges, lineMat);
          wire.position.set(px, py, pz);
          markerGroup.add(wire);
        }
      }
    }
  }, [
    clashes,
    selectedClash,
    selectedClashId,
    selectedFixtureId,
    strMode,
    arqMode,
    visibleMep,
    showFixtures,
    showClashMarkers,
    dimOthersOnFocus,
    resolvedIds,
  ]);

  // Actions
  const handleRunScan = () => {
    setScanPulse(true);
    setLastScanAt(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
    setTimeout(() => setScanPulse(false), 650);
  };

  const handleToggleResolve = (clashId: string) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clashId)) next.delete(clashId);
      else next.add(clashId);
      return next;
    });
    setReviewIds((prev) => {
      const next = new Set(prev);
      next.delete(clashId);
      return next;
    });
  };

  const handleToggleReview = (clashId: string) => {
    setReviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(clashId)) next.delete(clashId);
      else next.add(clashId);
      return next;
    });
  };

  const handleResolveAll = () => {
    setResolvedIds(new Set(clashes.map((c) => c.id)));
    setReviewIds(new Set());
  };

  const handleResetPreBim = () => {
    setResolvedIds(new Set());
    setReviewIds(new Set());
    setToleranceMm(0);
    setSelectedFixtureId(null);
    setSelectedClashId("CLH-001");
    flyCameraTo([8.6, 6.4, 9.2], [0, 2.8, 0]);
  };

  const handleSelectClash = (c: DetectedClash) => {
    setSelectedFixtureId(null);
    setSelectedClashId(c.id);
    focusOnClash(c);
  };

  const handleExportNavisworksXml = () => {
    const xml = buildNavisworksXmlReport(proyecto.nombre, clashes, toleranceMm);
    downloadTextFile(
      xml,
      `Navisworks_ClashReport_${proyecto.id}_PORTICO2N_MEP.xml`,
      "application/xml;charset=utf-8"
    );
  };

  const handleExportCsv = () => {
    const csv = buildClashCsvReport(clashes, lang);
    downloadTextFile(
      csv,
      `Matriz_Interferencias_MEP_${proyecto.id}.csv`,
      "text/csv;charset=utf-8"
    );
  };

  const handleExportBcf = () => {
    const bcf = buildBcfJsonReport(proyecto.nombre, clashes);
    downloadTextFile(
      bcf,
      `Incidencias_BCF_${proyecto.id}_PORTICO2N.bcf.json`,
      "application/json;charset=utf-8"
    );
  };

  const handleImportNavisworksXml = async (file: File) => {
    setXmlError(null);
    try {
      const text = await file.text();
      const parsed = parseNavisworksXmlReport(text);
      if (parsed.length === 0) {
        setXmlError(
          L(
            "No se encontraron nodos <clashresult> en el XML seleccionado.",
            "No <clashresult> nodes were found in the uploaded XML file."
          )
        );
        return;
      }
      setImportedXmlClashes(parsed);
      setImportedXmlFile(file.name);
    } catch (err) {
      setXmlError(err instanceof Error ? err.message : String(err));
    }
  };

  const severityBadge = (sev: DetectedClash["severity"]) => {
    if (sev === "critical") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 border border-rose-500/30">
          <AlertOctagon className="w-2.5 h-2.5" />
          {L("Crítica", "Critical")}
        </span>
      );
    }
    if (sev === "major") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 border border-amber-500/30">
          <AlertTriangle className="w-2.5 h-2.5" />
          {L("Mayor", "Major")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/15 text-sky-700 border border-sky-500/30">
        {L("Menor", "Minor")}
      </span>
    );
  };

  const statusBadge = (status: DetectedClash["status"]) => {
    if (status === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
          <CheckCircle2 className="w-2.5 h-2.5" />
          {L("Resuelta", "Resolved")}
        </span>
      );
    }
    if (status === "review") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-700 border border-indigo-500/30">
          {L("En Revisión", "Reviewed")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
        {L("Activa", "Active")}
      </span>
    );
  };

  // Count open clashes affecting a specific discipline for live normative badge
  const openClashesForDiscipline = (disc: MepDiscipline) =>
    clashes.filter(
      (c) => c.status !== "resolved" && (c.disciplineA === disc || c.disciplineB === disc)
    ).length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bento-card flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 border border-cyan-500/30">
              <ScanSearch className="w-3 h-3" />
              {L(
                "NAVISWORKS WORKFLOW • MEP INTEGRAL + APARATOS 3D",
                "NAVISWORKS WORKFLOW • FULL MEP + 3D FIXTURES"
              )}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              RETIE · NTC 2050 · RETILAP · NTC 1500/RAS · ASHRAE 62.1/90.1 · NSR-10 J/K · NTC 2505
            </span>
            {isDemo && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {L("Simulación Interactiva Libre", "Interactive Sandbox")}
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {L(
              "Coordinación BIM MEP, Muebles Conectados y Cumplimiento Normativo",
              "MEP BIM Coordination, Connected Fixtures & Code Compliance"
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {L(
              "5 especialidades (HVAC, Hidrosanitaria, Eléctrica/RETILAP, Gas Natural y PCI) con muebles sanitarios, cocina, luminarias y equipos conectados en 3D + Clash Detective real.",
              "5 disciplines (HVAC, Plumbing, Electrical/RETILAP, Natural Gas & Fire PCI) with connected 3D fixtures, appliances & real-time AABB Clash Detective."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRunScan}
            className="steel-btn-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          >
            <Play className={`w-3.5 h-3.5 ${scanPulse ? "animate-ping" : ""}`} />
            <span>{L("Ejecutar Clash Detective", "Run Clash Detective")}</span>
          </button>
          <button
            type="button"
            onClick={handleResolveAll}
            disabled={stats.active === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{L("Auto-Coordinar Todo (0 Clashes)", "Auto-Coordinate All (0 Clashes)")}</span>
          </button>
          <button
            type="button"
            onClick={handleResetPreBim}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
            title={L("Volver al estado inicial sin coordinar (Pre-BIM)", "Reset to Pre-BIM uncoordinated state")}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Pre-BIM</span>
          </button>
        </div>
      </div>

      {/* 4 Executive Coordination KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bento-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {L("Interferencias Activas", "Active Clashes")}
            </span>
            {stats.active === 0 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold kpi-num ${
                stats.active === 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {stats.active}
            </span>
            <span className="text-xs font-medium text-slate-400">
              / {stats.total} {L("detectadas", "detected")}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${stats.pctCoordinated}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>
              {stats.active === 0
                ? L("Modelo 100% libre de choques", "100% Clash-Free Model")
                : `${stats.pctCoordinated}% ${L("coordinado", "coordinated")}`}
            </span>
            <span className="font-mono text-[10px]">{lastScanAt}</span>
          </div>
        </div>

        <div className="bento-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {L("Críticas (STR / GAS-RETIE)", "Critical (STR / GAS-RETIE)")}
            </span>
            <Box className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold kpi-num text-slate-900">{stats.criticalOpen}</span>
            <span className="text-xs text-slate-500">NSR-10 · NTC 2505 · RETIE</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.maxPenMm > 0
              ? `${L("Penetración máxima activa:", "Max active penetration:")} `
              : L("Sin invasión a estructura ni gas-electricidad", "Zero structural or gas-electric conflicts")}
            {stats.maxPenMm > 0 && (
              <span className="font-mono font-bold text-rose-600">{stats.maxPenMm} mm</span>
            )}
          </p>
        </div>

        <div className="bento-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {L("Conflictos MEP vs. MEP", "MEP vs. MEP Clashes")}
            </span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold kpi-num text-slate-900">{stats.mepVsMepOpen}</span>
            <span className="text-xs text-slate-500">HVAC · PLU · ELEC · GAS · PCI</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {L(
              `${PORTICO_2N_FIXTURES.length} grupos de muebles y equipos conectados en 3D.`,
              `${PORTICO_2N_FIXTURES.length} connected 3D fixture & appliance assemblies.`
            )}
          </p>
        </div>

        <div className="bento-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {L("Ahorro Retrabajos Evitados", "Avoided Rework Savings")}
            </span>
            <Wrench className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold kpi-num text-emerald-600 mt-1">
            {formatMoney(stats.realizedSavings)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {L("Potencial total coordinado:", "Total coordination potential:")}{" "}
            <span className="font-mono font-semibold text-slate-700">
              {formatMoney(stats.totalPotentialSavings)}
            </span>
          </p>
        </div>
      </div>

      {/* Main Split Workstation: 3D Coordination Viewport + Navisworks Clash Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT 7 COLS: 3D MODEL VIEWPORT + SELECTION TREE */}
        <div className="xl:col-span-7 bento-card p-3 sm:p-4 space-y-3">
          {/* Navisworks Selection Tree & 5-Discipline Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
                <Layers className="w-3.5 h-3.5" />
                {L("Árbol:", "Tree:")}
              </span>

              <button
                type="button"
                onClick={() =>
                  setStrMode((m) => (m === "xray" ? "solid" : m === "solid" ? "hidden" : "xray"))
                }
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  strMode === "hidden"
                    ? "bg-slate-100 text-slate-400 border-slate-200"
                    : "bg-slate-900 text-white border-slate-800"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>
                  STR:{" "}
                  {strMode === "xray"
                    ? L("Rayos X", "X-Ray")
                    : strMode === "solid"
                    ? L("Sólido", "Solid")
                    : L("Off", "Off")}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setArqMode((m) => (m === "hidden" ? "ghost" : m === "ghost" ? "solid" : "hidden"))
                }
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  arqMode === "hidden"
                    ? "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    : "bg-slate-700 text-white border-slate-700"
                }`}
              >
                {arqMode === "hidden" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>
                  ARQ:{" "}
                  {arqMode === "hidden"
                    ? "Off"
                    : arqMode === "ghost"
                    ? L("Fantasma", "Ghost")
                    : L("Sólido", "Solid")}
                </span>
              </button>

              {(
                [
                  {
                    key: "HVAC",
                    label: "HVAC",
                    dot: "bg-cyan-400",
                    activeCls: "bg-cyan-500/15 text-cyan-800 border-cyan-500/40",
                  },
                  {
                    key: "PLU",
                    label: L("Hidrosan.", "Plumb"),
                    dot: "bg-blue-500",
                    activeCls: "bg-blue-500/15 text-blue-800 border-blue-500/40",
                  },
                  {
                    key: "ELEC",
                    label: L("Eléc./LED", "Elec/LED"),
                    dot: "bg-red-500",
                    activeCls: "bg-rose-500/15 text-rose-800 border-rose-500/40",
                  },
                  {
                    key: "GAS",
                    label: "Gas",
                    dot: "bg-yellow-400",
                    activeCls: "bg-yellow-400/20 text-amber-900 border-yellow-500/50",
                  },
                  {
                    key: "PCI",
                    label: "PCI",
                    dot: "bg-rose-600",
                    activeCls: "bg-pink-500/15 text-rose-800 border-rose-500/40",
                  },
                ] as const
              ).map((d) => {
                const on = visibleMep[d.key];
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setVisibleMep((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      on ? d.activeCls : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${on ? d.dot : "bg-slate-300"}`} />
                    <span>{d.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowFixtures((v) => !v)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  showFixtures
                    ? "bg-emerald-500/15 text-emerald-800 border-emerald-500/40"
                    : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                }`}
              >
                <span>{L("Muebles 3D", "3D Fixtures")}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowClashMarkers((v) => !v)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                  showClashMarkers
                    ? "bg-rose-500/15 text-rose-700 border-rose-500/30"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>{L("Esferas", "Pins")}</span>
              </button>
              <button
                type="button"
                onClick={() => setDimOthersOnFocus((v) => !v)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                  dimOthersOnFocus
                    ? "bg-indigo-500/15 text-indigo-700 border-indigo-500/30"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
                title={L("Atenuar elementos no involucrados (estilo Navisworks Dim Other)", "Dim unrelated elements")}
              >
                <Focus className="w-3 h-3" />
                <span>{L("Aislar", "Dim")}</span>
              </button>
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#0b1120]">
            <div ref={containerRef} className="w-full h-[460px] sm:h-[520px] cursor-grab active:cursor-grabbing" />

            {/* Top-left floating camera presets (including Bathrooms & Kitchen close-ups!) */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[92%]">
              {(
                [
                  { label: L("Isométrica", "Isometric"), pos: [8.6, 6.4, 9.2], target: [0, 2.8, 0] },
                  { label: L("Baño Social N1", "L1 Bath"), pos: [-1.1, 1.85, -0.6], target: [-3.2, 0.55, -2.7] },
                  { label: L("Cocina & Gas", "Kitchen/Gas"), pos: [0.5, 2.25, -0.4], target: [-1.5, 1.0, -3.0] },
                  { label: L("Baño 1 N2", "L2 Bath"), pos: [0.9, 4.9, -0.2], target: [-1.1, 3.65, -2.5] },
                  { label: L("Plenum N1", "L1 Plenum"), pos: [5.5, 2.8, 6.2], target: [-0.4, 2.45, 0.8] },
                  { label: L("Cubierta", "Roof"), pos: [6.8, 9.2, 5.8], target: [-0.4, 5.9, -0.8] },
                ] as Array<{ label: string; pos: [number, number, number]; target: [number, number, number] }>
              ).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSelectedClashId(null);
                    setSelectedFixtureId(null);
                    flyCameraTo(preset.pos, preset.target);
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 backdrop-blur-sm transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Bottom HUD Legend inside 3D Viewport */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/85 border border-slate-800/90 backdrop-blur-sm text-[10.5px] text-slate-300">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>{L("Choque A", "Clash A")}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span>{L("B / Resuelto", "B / Fixed")}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>HVAC</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{L("Agua", "Water")}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{L("Sanit.", "Sanit.")}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{L("Eléc.", "Elec.")}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span>Gas</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-600" />
                  <span>PCI</span>
                </span>
              </div>
              {selectedClash && (
                <div className="font-mono text-[10px] text-amber-300">
                  {selectedClash.id} · X:{selectedClash.point[0].toFixed(2)} Y:
                  {selectedClash.point[1].toFixed(2)} Z:{selectedClash.point[2].toFixed(2)} m
                </div>
              )}
            </div>
          </div>

          {/* Navisworks / OpenBIM Interoperability Bar */}
          <div className="steel-subcard rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-900">
                {L(
                  "Interoperabilidad Navisworks Manage & OpenBIM (XML / CSV / BCF)",
                  "Navisworks Manage & OpenBIM Bridge (XML / CSV / BCF)"
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {L(
                  "Exporta reportes compatibles con Navisworks Clash Detective o importa un .xml real exportado desde Navisworks.",
                  "Export Navisworks Clash Detective reports or upload a real .xml exported from Navisworks Manage."
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportNavisworksXml}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors"
              >
                <FileCode2 className="w-3.5 h-3.5 text-cyan-600" />
                <span>Navisworks .XML</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel .CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportBcf}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>BCF .JSON</span>
              </button>
              <button
                type="button"
                onClick={() => xmlInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{L("Importar .XML", "Import .XML")}</span>
              </button>
              <input
                ref={xmlInputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportNavisworksXml(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          {xmlError && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {xmlError}
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: CLASH DETECTIVE MATRIX + ENGINEERING INSPECTOR */}
        <div className="xl:col-span-5 bento-card p-3 sm:p-4 space-y-3">
          <div className="space-y-2.5 pb-2.5 border-b border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ScanSearch className="w-4 h-4 text-emerald-600" />
                <span>
                  {L(
                    `Matriz Clash Detective (${stats.total} Pruebas)`,
                    `Clash Detective Matrix (${stats.total} Rules)`
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-500">{L("Tolerancia:", "Tolerance:")}</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {toleranceMm} mm
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 shrink-0">0 mm (Hard)</span>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={toleranceMm}
                onChange={(e) => setToleranceMm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
              <span className="text-[10px] text-slate-500 shrink-0">
                {L("60 mm (Holgura)", "60 mm (Clear.)")}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "all", label: `${L("Todas", "All")} (${stats.total})` },
                  { id: "str_mep", label: "STR vs. MEP" },
                  { id: "mep_mep", label: "MEP vs. MEP" },
                  { id: "active", label: `${L("Activas", "Active")} (${stats.active})` },
                  { id: "resolved", label: `${L("Resueltas", "Resolved")} (${stats.resolved})` },
                ] as Array<{ id: ClashFilter; label: string }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    filterMode === f.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clash Results Scrollable List */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {filteredClashes.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                {L("No hay interferencias en este filtro.", "No clashes match this filter.")}
              </div>
            ) : (
              filteredClashes.map((c) => {
                const selected = c.id === selectedClashId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClash(c)}
                    className={`w-full text-left rounded-xl p-2.5 border transition-all ${
                      selected
                        ? "border-slate-900 bg-slate-900/5 ring-1 ring-slate-900/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-slate-900">
                          {c.id}
                        </span>
                        {severityBadge(c.severity)}
                        {statusBadge(c.status)}
                      </div>
                      <span
                        className={`font-mono text-[11px] font-bold shrink-0 ${
                          c.penetrationMm > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {c.penetrationMm > 0 ? `-${c.penetrationMm} mm` : "0 mm ✓"}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-900 mt-1 line-clamp-1">
                      {isEn ? c.titleEn : c.titleEs}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mt-1">
                      <span className="truncate">
                        <strong className="text-slate-700">{c.elementAId}</strong> ({c.disciplineA}) ↔{" "}
                        <strong className="text-slate-700">{c.elementBId}</strong> ({c.disciplineB})
                      </span>
                      <span className="font-mono shrink-0">{c.gridRef}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Active Clash Engineering Resolution Card */}
          {selectedClash && (
            <div className="steel-subcard rounded-xl p-3 space-y-2.5 border border-slate-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {selectedClash.id}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                      {selectedClash.testSet} · {selectedClash.gridRef}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1">
                    {isEn ? selectedClash.titleEn : selectedClash.titleEs}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => focusOnClash(selectedClash)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shrink-0"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{L("Enfocar", "Focus")}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white rounded-lg p-2 border border-slate-200/80">
                  <div className="text-[9.5px] font-bold uppercase text-rose-600">
                    {L("Elemento A", "Item A")} · {selectedClash.disciplineA}
                  </div>
                  <div className="font-semibold text-slate-800 mt-0.5 leading-snug">
                    {isEn ? selectedClash.elementANameEn : selectedClash.elementANameEs}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-slate-200/80">
                  <div className="text-[9.5px] font-bold uppercase text-emerald-600">
                    {L("Elemento B", "Item B")} · {selectedClash.disciplineB}
                  </div>
                  <div className="font-semibold text-slate-800 mt-0.5 leading-snug">
                    {isEn ? selectedClash.elementBNameEn : selectedClash.elementBNameEs}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] leading-relaxed">
                <p className="text-slate-600">
                  <strong className="text-slate-800">{L("Diagnóstico:", "Diagnosis:")}</strong>{" "}
                  {isEn ? selectedClash.causeEn : selectedClash.causeEs}
                </p>
                <p className="text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 rounded-lg px-2.5 py-1.5">
                  <strong>{L("Solución BIM 3D:", "3D BIM Fix:")}</strong>{" "}
                  {isEn ? selectedClash.solutionEn : selectedClash.solutionEs}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-0.5">
                  <span>
                    <strong>{L("Norma:", "Code:")}</strong> {selectedClash.normRef}
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {L("Ahorro:", "Savings:")} {formatMoney(selectedClash.reworkSavingsCop)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleToggleResolve(selectedClash.id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    selectedClash.status === "resolved"
                      ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {selectedClash.status === "resolved" ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{L("Revertir a Pre-BIM", "Revert to Pre-BIM")}</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="w-3.5 h-3.5" />
                      <span>
                        {L("Aplicar Rerouting 3D (Resolver)", "Apply 3D Rerouting (Resolve)")}
                      </span>
                    </>
                  )}
                </button>

                {selectedClash.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => handleToggleReview(selectedClash.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 transition-colors"
                  >
                    <span>
                      {selectedClash.status === "review"
                        ? L("Quitar Revisión", "Unmark Review")
                        : L("En Revisión", "Mark Review")}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REGULATORY COMPLIANCE MATRIX & CONNECTED 3D FIXTURES CATALOG */}
      <div className="bento-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <BookCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {L(
                  "Cumplimiento Normativo Residencial & Muebles Conectados a Redes 3D",
                  "Residential Code Compliance & Connected 3D Fixtures Inventory"
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {L(
                "Haz clic en cualquier normativa o aparato sanitario/eléctrico/gas/PCI para enfocar la cámara 3D directo a su conexión.",
                "Click any regulatory card or connected fixture to fly the 3D camera straight to its pipe/conduit connection."
              )}
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setCatalogView("standards")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                catalogView === "standards"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {L("Normativa Aplicada (6)", "Applied Codes (6)")}
            </button>
            <button
              type="button"
              onClick={() => setCatalogView("fixtures")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                catalogView === "fixtures"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {L(
                `Muebles & Equipos Conectados (${PORTICO_2N_FIXTURES.length})`,
                `Connected Fixtures (${PORTICO_2N_FIXTURES.length})`
              )}
            </button>
          </div>
        </div>

        {catalogView === "standards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {NORMATIVE_STANDARDS_CATALOG.map((std) => {
              const openCount = openClashesForDiscipline(std.discipline);
              const isCompliant = openCount === 0;
              return (
                <div
                  key={std.id}
                  className="steel-subcard rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md text-white"
                        style={{ backgroundColor: std.colorHex }}
                      >
                        {std.discipline === "GAS" || std.discipline === "PCI" ? (
                          <Flame className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        <span>{std.code}</span>
                      </span>
                      {isCompliant ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          {L("Cumple 3D", "3D OK")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          {openCount} {L("clash", "clash")}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 mt-2">
                      {isEn ? std.titleEn : std.titleEs}
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {isEn ? std.requirementsEn : std.requirementsEs}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClashId(null);
                      setSelectedFixtureId(null);
                      setShowFixtures(true);
                      setVisibleMep((prev) => ({ ...prev, [std.discipline]: true }));
                      flyCameraTo(std.cameraPos, std.focusPoint);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{L("Inspeccionar Especialidad en 3D", "Inspect Specialty in 3D")}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "ALL", label: `${L("Todos", "All")} (${PORTICO_2N_FIXTURES.length})` },
                  { id: "PLU", label: L("Hidrosanitaria (NTC 1500/RAS)", "Plumbing (NTC 1500)") },
                  { id: "ELEC", label: L("Eléctrica & RETILAP", "Electrical & RETILAP") },
                  { id: "HVAC", label: "HVAC (ASHRAE 62.1/90.1)" },
                  { id: "GAS", label: "Gas Natural (NTC 2505)" },
                  { id: "PCI", label: "PCI (NSR-10 Tít. J/K)" },
                ] as Array<{ id: MepDiscipline | "ALL"; label: string }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFixtureDisciplineFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    fixtureDisciplineFilter === f.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">{L("Mueble / Equipo 3D", "3D Fixture / Equipment")}</th>
                    <th className="py-2 pr-3">{L("Espacio", "Room")}</th>
                    <th className="py-2 pr-3">{L("Conexión a Red / Tubería", "Network Connection")}</th>
                    <th className="py-2 pr-3">{L("Normativa", "Code")}</th>
                    <th className="py-2 text-right">{L("Cámara", "View")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFixtures.map((fix) => {
                    const active = selectedFixtureId === fix.id;
                    return (
                      <tr
                        key={fix.id}
                        className={active ? "bg-cyan-500/10" : "hover:bg-slate-50"}
                      >
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-slate-900">
                            {isEn ? fix.nameEn : fix.nameEs}
                          </div>
                          <div className="text-[10.5px] text-slate-500">
                            {isEn ? fix.normDetailEn : fix.normDetailEs}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                          {isEn ? fix.roomEn : fix.roomEs}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10.5px] text-slate-600">
                          {isEn ? fix.connectedToEn : fix.connectedToEs}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                            {fix.normCode}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => focusOnFixture(fix)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                          >
                            <Crosshair className="w-3 h-3 text-cyan-600" />
                            <span>{L("Ver 3D", "Focus")}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Imported External Navisworks Manage XML Table */}
      {importedXmlClashes.length > 0 && (
        <div className="bento-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {L(
                  "Reporte Importado desde Autodesk Navisworks Manage",
                  "Imported Autodesk Navisworks Manage Report"
                )}{" "}
                <span className="font-mono text-xs text-cyan-700">({importedXmlFile})</span>
              </h3>
              <p className="text-xs text-slate-500">
                {importedXmlClashes.length}{" "}
                {L(
                  "interferencias leídas del archivo XML.",
                  "clash results parsed from uploaded XML."
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setImportedXmlClashes([]);
                setImportedXmlFile(null);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200"
            >
              {L("Limpiar importación", "Clear Import")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">{L("Prueba", "Test")}</th>
                  <th className="py-2 pr-3">{L("Nombre Clash", "Clash Name")}</th>
                  <th className="py-2 pr-3">{L("Elemento A ↔ B", "Item A ↔ B")}</th>
                  <th className="py-2 pr-3">{L("Ubicación", "Grid")}</th>
                  <th className="py-2 pr-3 text-right">Dist. (mm)</th>
                  <th className="py-2 text-right">{L("Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importedXmlClashes.slice(0, 50).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-3 font-mono font-bold text-slate-900">{row.id}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.testName}</td>
                    <td className="py-2 pr-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.itemA} ↔ {row.itemB}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-600">{row.gridLocation}</td>
                    <td className="py-2 pr-3 text-right font-mono font-bold text-rose-600">
                      -{row.distanceMm} mm
                    </td>
                    <td className="py-2 text-right uppercase font-bold text-[10px] text-slate-700">
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
