"use client";

import React from "react";
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  Sun,
  User,
} from "lucide-react";
import { AppCurrency, useAppPreferences } from "../lib/i18n";
import { findTabGroupKey, TAB_ICONS } from "../lib/navigation";
import { BITACORA_APP_URL } from "../lib/projects";
import { ConsolidationTotals, ProjectConfig, TabKey } from "../lib/types";

interface TopHeaderProps {
  proyecto: ProjectConfig;
  totals: ConsolidationTotals;
  activeTab: TabKey;
  onChangeTab?: (tab: TabKey) => void;
  onOpenMenuMobile: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebarDesktop?: () => void;
  engineSource: "pandas" | "client-ts";
  userEmail?: string;
  isDemo?: boolean;
  onLogout?: () => void;
}

export default function TopHeader({
  proyecto,
  totals,
  activeTab,
  onOpenMenuMobile,
  sidebarCollapsed = false,
  onToggleSidebarDesktop,
  engineSource,
  userEmail,
  isDemo = false,
  onLogout,
}: TopHeaderProps) {
  const {
    lang,
    setLang,
    currency,
    setCurrency,
    unitSystem,
    rates,
    fxSource,
    darkTheme,
    setDarkTheme,
    formatMoney,
    tr,
  } = useAppPreferences();

  const ActiveIcon = TAB_ICONS[activeTab];
  const activeGroupKey = findTabGroupKey(activeTab);

  return (
    <header className="space-y-3">
      {/* Slim Minimalist Utility & Breadcrumb Bar */}
      <div className="topbar-utility flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenMenuMobile}
            className="lg:hidden topbar-pill inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>{tr.menuMobile}</span>
          </button>

          {onToggleSidebarDesktop && (
            <button
              type="button"
              onClick={onToggleSidebarDesktop}
              title={sidebarCollapsed ? tr.toggleSidebarShow : tr.toggleSidebarHide}
              className="hidden lg:inline-flex topbar-pill items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <span className="hidden sm:inline font-medium text-slate-400">
              {tr.groups[activeGroupKey]}
            </span>
            <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 truncate">
              <ActiveIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{tr.tabs[activeTab]}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Subtle Demo / Online indicator */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              isDemo
                ? "bg-amber-50/90 border-amber-200 text-amber-800"
                : "bg-emerald-50/90 border-emerald-200 text-emerald-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDemo ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            <span>
              {isDemo
                ? "Demo"
                : engineSource === "pandas"
                ? "Live · Pandas"
                : "Live"}
            </span>
          </span>

          <a
            href={BITACORA_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex topbar-pill items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
          >
            <Smartphone className="w-3 h-3 text-slate-500" />
            <span>{tr.openBitacora}</span>
            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
          </a>

          {/* Language & Units Switcher */}
          <div
            className="topbar-pill inline-flex items-center rounded-lg bg-white border border-slate-200 p-0.5 text-[10px] font-bold"
            title={
              lang === "en"
                ? "Language: English • Imperial Units (ft², yd³, ft, lb)"
                : "Idioma: Español • Sistema Métrico SI (m², m³, ml, kg)"
            }
          >
            {(["es", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`px-2 py-0.5 rounded-md uppercase transition-colors ${
                  lang === code
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {code}
              </button>
            ))}
            <span className="px-1.5 text-[9px] font-mono text-slate-400 border-l border-slate-200 ml-0.5">
              {unitSystem === "imperial" ? "IMP" : "SI"}
            </span>
          </div>

          {/* Currency Switcher */}
          <div
            className="topbar-pill inline-flex items-center rounded-lg bg-white border border-slate-200 p-0.5 text-[10px] font-bold"
            title={`${fxSource} • 1 USD = ${rates.USD.toLocaleString("en-US")} COP • 1 EUR = ${rates.EUR.toLocaleString("en-US")} COP`}
          >
            {(["COP", "USD", "EUR"] as AppCurrency[]).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrency(curr)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  currency === curr
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setDarkTheme(!darkTheme)}
            title={
              darkTheme
                ? "Switch to Light Mode"
                : "Switch to Dark Mode"
            }
            className="topbar-pill inline-flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors"
          >
            {darkTheme ? (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-600" />
            )}
          </button>

          {userEmail && !isDemo && (
            <span
              title={userEmail}
              className="hidden md:inline-flex topbar-pill items-center gap-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-medium px-2.5 py-1 rounded-lg"
            >
              <User className="w-3 h-3" />
              <span>{userEmail.split("@")[0]}</span>
            </span>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title={isDemo ? tr.enterRealAccount : tr.signOut}
              className={`inline-flex items-center gap-1 border text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                isDemo
                  ? "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
                  : "bg-white hover:bg-rose-50 border-slate-200 text-rose-600"
              }`}
            >
              <LogOut className="w-3 h-3" />
              <span>{isDemo ? tr.enterRealAccount : tr.signOut}</span>
            </button>
          )}
        </div>
      </div>

      {/* Slim Matte Project Summary Banner */}
      <div className="steel-panel-dark rounded-2xl text-white px-5 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <span>{proyecto.badge}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 truncate">{proyecto.modelo_bim}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate mt-0.5">
              {proyecto.nombre}
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {tr.clientLabel}: <span className="text-slate-200 font-medium">{proyecto.contratante}</span>
              <span className="mx-2 text-slate-600">·</span>
              {tr.directorLabel}: <span className="text-slate-200 font-medium">{proyecto.contratista}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 min-w-[128px]">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {tr.weightedProgress}
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                {totals.avance_fisico_ponderado.toFixed(1)}%
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-400/25 rounded-xl px-4 py-2 min-w-[152px]">
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300/90">
                {tr.earnedCostDirect}
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                {formatMoney(totals.total_costo_ejecutado)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
