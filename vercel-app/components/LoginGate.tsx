"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Compass,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Smartphone,
} from "lucide-react";
import {
  AuthSession,
  createDemoSession,
  loadRememberedEmail,
  saveRememberedEmail,
  sendPasswordRecovery,
  signInWithPassword,
} from "../lib/auth";
import { useAppPreferences } from "../lib/i18n";
import { BITACORA_APP_URL, HAS_SUPABASE_CONFIG } from "../lib/projects";

interface LoginGateProps {
  onAuthenticated: (session: AuthSession) => void;
}

export default function LoginGate({ onAuthenticated }: LoginGateProps) {
  const { lang, setLang, tr } = useAppPreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [showCorporateForm, setShowCorporateForm] = useState(HAS_SUPABASE_CONFIG);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const saved = loadRememberedEmail();
    if (saved) {
      setEmail(saved);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (recoveryMode) {
        await sendPasswordRecovery(email);
        setSuccessMsg(
          lang === "en"
            ? "Recovery instructions sent to your email address."
            : "Se envió un correo con instrucciones para restablecer tu contraseña."
        );
      } else {
        const session = await signInWithPassword(email, password);
        saveRememberedEmail(email, rememberEmail);
        onAuthenticated(session);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error de autenticación."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px] rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {/* Minimalist Dark Brand Header */}
        <div className="steel-panel-dark px-6 py-6 text-center text-white">
          <div className="flex items-center justify-between gap-2 mb-5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
              ISO 19650 · BIM 5D
            </span>

            <div className="inline-flex items-center rounded-lg bg-white/10 border border-white/15 p-0.5 text-[10px] font-bold">
              <Globe className="w-3 h-3 text-slate-300 ml-1.5 mr-1" />
              <button
                type="button"
                onClick={() => setLang("es")}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  lang === "es"
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  lang === "en"
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <img
            src="/logo-mark.png"
            alt="JGM ConTech"
            className="w-16 h-16 rounded-2xl border border-white/15 shadow-md mx-auto mb-3 object-cover"
          />

          <h1 className="text-xl font-bold tracking-tight text-white">
            JGM ConTech
          </h1>
          <p className="text-xs text-slate-300 mt-1">{tr.login.subtitle}</p>
          <p className="text-[11px] font-medium text-emerald-400 mt-1.5 max-w-xs mx-auto leading-snug">
            {tr.appSlogan}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Demo Showcase Primary CTA */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>{tr.login.demoDivider}</span>
              <span className="text-emerald-700 font-bold">
                {lang === "en" ? "Open Access" : "Acceso Libre"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onAuthenticated(createDemoSession())}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-4 transition-colors shadow-sm"
            >
              <Compass className="w-4 h-4" />
              <span>{tr.login.demoBtn}</span>
            </button>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              {tr.login.demoHint}
            </p>
          </div>

          {!HAS_SUPABASE_CONFIG && (
            <button
              type="button"
              onClick={() => setShowCorporateForm((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>
                {lang === "en"
                  ? "Private Team Sign In"
                  : "¿Acceso corporativo privado? Iniciar sesión"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showCorporateForm ? "rotate-180" : ""
                }`}
              />
            </button>
          )}

          {showCorporateForm && (
            <div className="pt-2 border-t border-slate-200 space-y-3.5">
              {!HAS_SUPABASE_CONFIG && (
                <p className="text-[11px] text-slate-500 text-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {lang === "en"
                    ? "Public demo instance without private Supabase credentials. Use Demo Sandbox above."
                    : "Instancia demostrativa sin credenciales de Supabase configuradas. Usa el botón de Modo Demo."}
                </p>
              )}

              {errorMsg && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700 border border-rose-200">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="bim-login-email"
                    className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1"
                  >
                    {tr.login.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="bim-login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@jgmcontech.com"
                      required
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                {!recoveryMode && (
                  <div>
                    <label
                      htmlFor="bim-login-password"
                      className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1"
                    >
                      {tr.login.passwordLabel}
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="bim-login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Ocultar contraseña" : "Ver contraseña"
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {!recoveryMode && (
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900"
                      />
                      {tr.login.rememberEmail}
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryMode(true);
                        setErrorMsg("");
                        setSuccessMsg("");
                      }}
                      className="font-medium text-slate-500 hover:text-slate-900 underline underline-offset-2"
                    >
                      {tr.login.forgotPassword}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !HAS_SUPABASE_CONFIG}
                  className="w-full steel-btn-primary rounded-lg py-2.5 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? recoveryMode
                        ? tr.login.sendingRecoveryBtn
                        : tr.login.signingInBtn
                      : recoveryMode
                      ? tr.login.sendRecoveryBtn
                      : tr.login.signInBtn}
                  </span>
                </button>

                {recoveryMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(false);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="w-full inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 py-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> {tr.login.backToLogin}
                  </button>
                )}
              </form>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{tr.login.footerNote}</span>
            <a
              href={BITACORA_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-950 transition-colors shrink-0 ml-2"
            >
              <Smartphone className="w-3 h-3" />
              <span>{lang === "en" ? "Field App" : "Bitácora"}</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
