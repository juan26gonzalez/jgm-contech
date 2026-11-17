"use client";

import React, { useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  FolderKanban,
  Globe,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAppPreferences } from "../lib/i18n";
import { TAB_GROUPS, TAB_ICONS } from "../lib/navigation";
import { BITACORA_APP_URL } from "../lib/projects";
import { LiquidationParams, ProjectConfig, TabKey } from "../lib/types";

interface SidebarProps {
  proyectos: Record<string, ProjectConfig>;
  proyectoActivoId: string;
  onSelectProyecto: (id: string) => void;
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onOpenNewModal: () => void;
  onDeleteCustomProyecto: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onSyncCloud: () => void;
  syncing: boolean;
  totalRegistrosCloud: number;
  engineStatus: "pandas" | "client-ts" | "checking";
  params: LiquidationParams;
  onChangeParams: (next: LiquidationParams) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
  isDemo?: boolean;
}

export default function Sidebar({
  proyectos,
  proyectoActivoId,
  onSelectProyecto,
  activeTab,
  onChangeTab,
  onOpenNewModal,
  onDeleteCustomProyecto,
  onExportBackup,
  onImportBackup,
  onSyncCloud,
  syncing,
  totalRegistrosCloud,
  engineStatus,
  params,
  onChangeParams,
  mobileOpen,
  onCloseMobile,
  collapsed = false,
  isDemo = false,
}: SidebarProps) {
  const { tr, lang } = useAppPreferences();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  const proyectoActual = proyectos[proyectoActivoId] || Object.values(proyectos)[0];

  const getOptionLabel = (p: ProjectConfig) => {
    if (p.id === "proto_residencial") return "Vivienda Prototipo BIM 1.1";
    if (p.id === "proto_corporativo") return "Edificio Modelo 3 Niveles";
    if (p.id === "demo_showcase") return p.nombre;
    return `${p.nombre} (${p.contratante})`;
  };

  const handleSlider = (key: keyof LiquidationParams, value: number) => {
    onChangeParams({ ...params, [key]: value });
  };

  const demoReadOnlyTip =
    lang === "en" ? "Read-only LinkedIn showcase mode" : "Modo Demo LinkedIn de solo lectura";

  const content = (
    <div className="sidebar-shell flex flex-col h-full bg-white border-r border-slate-200 px-3.5 py-3.5 select-none">
      {/* Compact Brand Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo-mark.png"
            alt="JGM ConTech"
            className="w-8 h-8 rounded-lg border border-slate-200 shrink-0 object-cover"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-slate-900 truncate">
                JGM ConTech
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                5D
              </span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              {tr.appSubtitle}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden text-slate-500 hover:text-slate-900 p-1 rounded-md"
          aria-label={tr.menuMobile}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Compact Project Selector */}
      <div className="mb-2.5 pb-2.5 border-b border-slate-200/80">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-0.5">
          <FolderKanban className="w-3 h-3 shrink-0" />
          <span>{tr.sidebar.portfolio}</span>
        </label>
        <select
          value={proyectoActivoId}
          onChange={(e) => {
            onSelectProyecto(e.target.value);
            onCloseMobile();
          }}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          {Object.values(proyectos).map((p) => (
            <option key={p.id} value={p.id}>
              {getOptionLabel(p)}
            </option>
          ))}
        </select>
        {proyectoActual && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-0.5 truncate">
            <span className="truncate">{proyectoActual.contratante}</span>
            <span className="font-mono shrink-0 ml-2">
              {proyectoActual.ppto_base?.length || 0} {tr.sidebar.itemsCount}
            </span>
          </div>
        )}
      </div>

      {/* Primary Vertical Module Navigation */}
      <nav aria-label="Módulos BIM 5D" className="flex-1 overflow-y-auto pr-0.5 space-y-2.5">
        {TAB_GROUPS.map((grp) => (
          <div key={grp.groupKey} className="space-y-0.5">
            <div className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 px-2.5 mb-0.5">
              {tr.groups[grp.groupKey]}
            </div>
            {grp.keys.map((key) => {
              const Icon = TAB_ICONS[key];
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChangeTab(key);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors text-left ${
                    active ? "sidebar-nav-active font-semibold" : "sidebar-nav-idle"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-85" />
                  <span className="truncate">{tr.tabs[key]}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapsible Secondary Tools (AIU, Sync & Project Backup) */}
      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5">
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200/80 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === "en" ? "AIU & Project Tools" : "Ajustes AIU & Datos"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500">{totalRegistrosCloud}</span>
            {toolsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </span>
        </button>

        {toolsOpen && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3 text-xs">
            {/* Sync & Backup actions */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={onSyncCloud}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[11px] font-semibold py-1.5 px-2.5 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? tr.sidebar.syncing : tr.sidebar.syncNow}</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!isDemo) onOpenNewModal();
                  }}
                  disabled={isDemo}
                  title={isDemo ? demoReadOnlyTip : undefined}
                  className={`flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold py-1.5 px-2 rounded-lg transition-colors ${
                    isDemo ? "opacity-45 cursor-not-allowed" : ""
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>{tr.sidebar.newBtn}</span>
                </button>

                {proyectoActual?.isCustom && !isDemo ? (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomProyecto(proyectoActual.id)}
                    className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold py-1.5 px-2 rounded-lg"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{tr.sidebar.deleteBtn}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold py-1.5 px-2 rounded-lg"
                  >
                    <Download className="w-3 h-3" />
                    <span>{tr.sidebar.backupBtn}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isDemo) importInputRef.current?.click();
                }}
                disabled={isDemo}
                title={isDemo ? demoReadOnlyTip : undefined}
                className={`w-full flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium py-1 px-2 rounded-lg ${
                  isDemo ? "opacity-45 cursor-not-allowed" : ""
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>{tr.sidebar.restoreJson}</span>
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportBackup(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* AIU Sliders */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              {(
                [
                  { key: "pct_a", label: tr.sidebar.pctA, min: 0, max: 20, step: 0.5 },
                  { key: "pct_i", label: tr.sidebar.pctI, min: 0, max: 10, step: 0.5 },
                  { key: "pct_u", label: tr.sidebar.pctU, min: 0, max: 15, step: 0.5 },
                  { key: "pct_anticipo", label: tr.sidebar.pctAnt, min: 0, max: 50, step: 1 },
                  { key: "pct_garantia", label: tr.sidebar.pctGar, min: 0, max: 15, step: 0.5 },
                ] as const
              ).map((s) => (
                <div key={s.key} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-600">
                    <span>{s.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {params[s.key].toFixed(s.step < 1 ? 1 : 0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={params[s.key]}
                    onChange={(e) => handleSlider(s.key, Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Link & Engine Footer */}
        <a
          href={BITACORA_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{tr.sidebar.openFieldApp}</span>
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </a>

        <div className="flex items-center justify-between px-1 text-[10px] font-medium text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Cpu className="w-3 h-3 text-emerald-600" />
            {engineStatus === "pandas" ? "PYTHON PANDAS" : "BIM ENGINE v5D"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Globe className="w-3 h-3" />
            ISO 19650
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!collapsed && (
        <aside className="hidden lg:block w-[268px] shrink-0 sticky top-0 h-screen">
          {content}
        </aside>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-[268px] max-w-[85vw] h-full z-10 shadow-xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
