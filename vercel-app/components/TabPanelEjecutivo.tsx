"use client";

import React from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  Landmark,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  computePayrollSummary,
  type ClientsSummaryMetrics,
  type SstSummaryMetrics,
  type SuppliersSummaryMetrics,
} from "../lib/erpStorage";
import { useAppPreferences } from "../lib/i18n";
import { localizeChapter } from "../lib/units";
import {
  ConsolidationResult,
  LiquidationParams,
  PayrollProjectData,
  TabKey,
} from "../lib/types";

interface TabPanelEjecutivoProps {
  data: ConsolidationResult;
  params: LiquidationParams;
  sstSummary?: SstSummaryMetrics;
  payrollState?: PayrollProjectData;
  suppliersSummary?: SuppliersSummaryMetrics;
  clientsSummary?: ClientsSummaryMetrics;
  onNavigateTab?: (tab: TabKey) => void;
}

export default function TabPanelEjecutivo({
  data,
  params,
  sstSummary,
  payrollState,
  suppliersSummary,
  clientsSummary,
  onNavigateTab,
}: TabPanelEjecutivoProps) {
  const {
    tr,
    formatMoney,
    formatCompactChartMoney,
    chartUnitSuffix,
    currency,
    rates,
    fxLive,
    lang,
  } = useAppPreferences();

  const { totals, resumen_caps } = data;
  const pctAiu = (params.pct_a + params.pct_i + params.pct_u) / 100;
  const totalContratadoAiu = totals.total_ppto_contratado * (1 + pctAiu);
  const totalEjecAiu = totals.total_costo_ejecutado * (1 + pctAiu);
  const currencyPrefix = currency === "EUR" ? "€" : "$";
  const hasOverrun = totals.total_sobrecosto_cop > 0;

  const kpis = [
    {
      label: tr.exec.kpiBaseDirect,
      value: formatMoney(totals.total_ppto_contratado),
      sub: `${tr.exec.withAiu}: ${formatMoney(totalContratadoAiu)}`,
      dot: "bg-slate-400",
      valColor: "text-slate-900",
      progressPct: null as number | null,
    },
    {
      label: tr.exec.kpiExecDirect,
      value: formatMoney(totals.total_costo_ejecutado),
      sub: `${totals.avance_fisico_ponderado.toFixed(1)}% · ${tr.exec.withAiu}: ${formatMoney(totalEjecAiu)}`,
      dot: "bg-emerald-500",
      valColor: "text-emerald-700",
      progressPct: Math.min(totals.avance_fisico_ponderado, 100),
    },
    {
      label: tr.exec.kpiRemaining,
      value: formatMoney(totals.total_saldo_dinero),
      sub: tr.exec.contractAvailable,
      dot: "bg-sky-500",
      valColor: "text-slate-900",
      progressPct: null as number | null,
    },
    {
      label: tr.exec.kpiOverruns,
      value: formatMoney(totals.total_sobrecosto_cop),
      sub: hasOverrun ? tr.exec.overrunNeeded : tr.exec.noOverruns,
      dot: hasOverrun ? "bg-rose-500" : "bg-emerald-500",
      valColor: hasOverrun ? "text-rose-600" : "text-emerald-700",
      progressPct: null as number | null,
    },
  ];

  const chartData = resumen_caps.map((c) => {
    const locCap = localizeChapter(c.Capitulo, lang);
    return {
      name: locCap.length > 20 ? locCap.slice(0, 18) + "…" : locCap,
      fullName: locCap,
      Presupuestado: formatCompactChartMoney(c.Presupuesto_Total),
      Ejecutado: formatCompactChartMoney(c.Costo_Ejecutado),
      Avance: c["Avance_%"],
    };
  });

  const paySum = payrollState ? computePayrollSummary(payrollState, lang) : null;

  const pulseCards: {
    tab: TabKey;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    title: string;
    primary: string;
    meta: string;
  }[] = [];

  if (sstSummary) {
    pulseCards.push({
      tab: "sst",
      icon: ShieldCheck,
      accent: "text-emerald-600",
      title: lang === "en" ? "Safety & HSE" : "Seguridad & SST",
      primary: `${sstSummary.diasSinLti} ${lang === "en" ? "LTI-free d" : "días sin LTI"}`,
      meta: `${sstSummary.permisosActivos} PTAR · ${sstSummary.eppPct}% ${lang === "en" ? "PPE" : "EPP"}`,
    });
  }
  if (paySum) {
    pulseCards.push({
      tab: "nomina",
      icon: Wallet,
      accent: "text-sky-600",
      title: lang === "en" ? `Payroll (${paySum.periodo})` : `Nómina (${paySum.periodo})`,
      primary: formatMoney(paySum.netoPagarCop),
      meta: `${paySum.trabajadores} ${lang === "en" ? "crews/staff" : "cuadrillas/roles"}`,
    });
  }
  if (suppliersSummary) {
    pulseCards.push({
      tab: "proveedores",
      icon: Building2,
      accent: "text-amber-600",
      title: lang === "en" ? "Procurement & AP" : "Proveedores & OC",
      primary: formatMoney(suppliersSummary.cuentasPorPagarCop),
      meta: `${suppliersSummary.ordenesAbiertas} ${lang === "en" ? "open POs" : "OC abiertas"} · ${suppliersSummary.cumplimientoEntregaPct}%`,
    });
  }
  if (clientsSummary) {
    pulseCards.push({
      tab: "clientes",
      icon: Landmark,
      accent: "text-indigo-600",
      title: lang === "en" ? "Billing & AR" : "Clientes & Cobro",
      primary: formatMoney(clientsSummary.cuentasPorCobrarCop),
      meta: `${lang === "en" ? "Collected:" : "Caja:"} ${formatMoney(clientsSummary.totalRecaudadoCop)}`,
    });
  }

  return (
    <div className="space-y-4">
      {/* 4 Minimalist KPI Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="bento-card !p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${k.dot}`} />
                <span className="truncate">{k.label}</span>
              </div>
              <div className={`kpi-num text-xl sm:text-2xl font-bold mt-1.5 tracking-tight ${k.valColor}`}>
                {k.value}
              </div>
            </div>

            <div className="mt-2 space-y-1.5">
              {k.progressPct !== null && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${k.progressPct}%` }}
                  />
                </div>
              )}
              <div className="text-[11px] font-medium text-slate-500 truncate">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Chapter Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 bento-card !p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BarChart3 className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  {tr.exec.chartTitle} ({chartUnitSuffix})
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{tr.exec.chartSub}</p>
            </div>
          </div>
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
                  angle={-15}
                  textAnchor="end"
                  height={46}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `${currencyPrefix}${v}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [
                    `${currencyPrefix}${Number(val).toFixed(2)} ${chartUnitSuffix}`,
                    "",
                  ]}
                  contentStyle={{
                    borderRadius: 10,
                    borderColor: "#e2e8f0",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 8 }} />
                <Bar
                  dataKey="Presupuestado"
                  name={tr.exec.barBudget}
                  fill="#cbd5e1"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="Ejecutado"
                  name={tr.exec.barExec}
                  fill="#0f172a"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 bento-card !p-5 overflow-hidden">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ClipboardList className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{tr.exec.chapterTableTitle}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 mb-3">{tr.exec.chapterTableSub}</p>
          <div className="overflow-x-auto max-h-[290px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-2">{tr.exec.colChapter}</th>
                  <th className="py-2 px-2 text-right">{tr.exec.colBudget}</th>
                  <th className="py-2 px-2 text-right">{tr.exec.colExecuted}</th>
                  <th className="py-2 px-2 text-right">{tr.exec.colPct}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumen_caps.map((cap) => (
                  <tr key={cap.Capitulo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-1.5 px-2 font-semibold text-slate-800">
                      {localizeChapter(cap.Capitulo, lang)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-500 whitespace-nowrap">
                      {formatMoney(cap.Presupuesto_Total)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatMoney(cap.Costo_Ejecutado)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          cap["Avance_%"] >= 99
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : cap["Avance_%"] > 0
                            ? "bg-slate-100 text-slate-800"
                            : "text-slate-400"
                        }`}
                      >
                        {cap["Avance_%"].toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4 Uniform Compact ERP / Field Pulse Cards */}
      {pulseCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {pulseCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.tab}
                type="button"
                onClick={() => onNavigateTab?.(card.tab)}
                className="bento-card !p-3.5 text-left flex flex-col justify-between gap-2 group"
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Icon className={`w-3.5 h-3.5 ${card.accent}`} />
                    {card.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {card.primary}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {card.meta}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Subtle Minimalist Standards Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-[11px] text-slate-500">
        <span className="font-medium">
          ISO 19650 · OpenBIM IFC 2x3 / IFC4 · PMI Earned Value (EVM) · MS Project 4D
        </span>
        {currency !== "COP" && (
          <span className="font-mono text-[10px]" title={tr.exec.exchangeDisclaimer}>
            1 {currency} = $
            {(rates[currency] > 0
              ? Math.round(rates[currency])
              : currency === "EUR"
              ? 4680
              : 4350
            ).toLocaleString("en-US")}{" "}
            COP ({fxLive ? (lang === "en" ? "Live FX" : "TRM Vivo") : tr.exec.exchangeDisclaimer})
          </span>
        )}
      </div>
    </div>
  );
}
