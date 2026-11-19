import React from "react";
import {
  AlertTriangle,
  Box,
  Building2,
  Calculator,
  FileText,
  GanttChart,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Radio,
  Receipt,
  ScanSearch,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { TabKey } from "./types";

export type TabGroupKey =
  | "direction"
  | "bim3d"
  | "planning4d5d"
  | "field"
  | "controlBilling"
  | "erpFinance";

export const TAB_ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  panel: LayoutDashboard,
  visor3d: Box,
  coordinacion_mep: ScanSearch,
  habitaciones: LayoutGrid,
  presupuesto: Calculator,
  curva_s: GanttChart,
  insumos: Package,
  contratos: FileText,
  bitacora: Radio,
  rendimiento: Users,
  sst: ShieldCheck,
  mayores: AlertTriangle,
  actas: Receipt,
  nomina: Wallet,
  proveedores: Building2,
  clientes: Landmark,
};

export const TAB_GROUPS: { groupKey: TabGroupKey; keys: TabKey[] }[] = [
  { groupKey: "direction", keys: ["panel"] },
  { groupKey: "bim3d", keys: ["visor3d", "coordinacion_mep", "habitaciones"] },
  {
    groupKey: "planning4d5d",
    keys: ["presupuesto", "curva_s", "insumos", "contratos"],
  },
  { groupKey: "field", keys: ["bitacora", "rendimiento", "sst"] },
  { groupKey: "controlBilling", keys: ["mayores", "actas"] },
  { groupKey: "erpFinance", keys: ["nomina", "proveedores", "clientes"] },
];

export function findTabGroupKey(tab: TabKey): TabGroupKey {
  return TAB_GROUPS.find((g) => g.keys.includes(tab))?.groupKey || "direction";
}
