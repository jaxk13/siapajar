import React, { useState } from "react";
import { Lock, KeyRound, ShieldCheck, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AccessGateProps {
  onSuccess: () => void;
}

const REQUIRED_CODE = "GURU_HEBAT";

export default function AccessGate({ onSuccess }: AccessGateProps) {
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();

    if (!cleanCode) {
      setError(true);
      setErrorMessage("Silakan ketik kode akses terlebih dahulu.");
      return;
    }

    setIsVerifying(true);
    setError(false);

    setTimeout(() => {
      if (cleanCode === REQUIRED_CODE) {
        setIsSuccess(true);
        setError(false);
        try {
          localStorage.setItem("siapajar_access_code", REQUIRED_CODE);
        } catch {
          // ignore localStorage error if in private mode
        }
        setTimeout(() => {
          onSuccess();
        }, 600);
      } else {
        setIsVerifying(false);
        setError(true);
        setErrorMessage("Kode akses tidak valid. Silakan periksa kembali kode Anda.");
      }
    }, 400);
  };

  const handleQuickFill = () => {
    setInputCode(REQUIRED_CODE);
    setError(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#0c2219] via-[#143325] to-[#1B4332] text-white relative overflow-hidden select-none">
      {/* Decorative Background Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#52B788]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#74C69D]/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-[#2D6A4F]/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-lg bg-[#142018]/90 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#2D6A4F] to-[#52B788] p-0.5 shadow-lg shadow-[#52B788]/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#143325] rounded-[14px] flex items-center justify-center">
                {isSuccess ? (
                  <CheckCircle2 className="w-9 h-9 text-[#52B788] animate-bounce" />
                ) : (
                  <Lock className="w-9 h-9 text-[#74C69D]" />
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#52B788] text-[#143325] p-1.5 rounded-full shadow">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#52B788]/15 border border-[#52B788]/30 text-[#74C69D] text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Akses Pendidik & Guru</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Siapajar.id
          </h1>
          <p className="text-sm sm:text-base text-white/70 max-w-sm mb-6 leading-relaxed">
            Silakan masukkan kode akses khusus untuk menggunakan Generator Naskah Ujian & Asesmen Sekolah.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="access_code_input"
              className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2"
            >
              Kode Akses Guru
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                id="access_code_input"
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  if (error) setError(false);
                }}
                placeholder="Contoh: GURU_HEBAT"
                disabled={isVerifying || isSuccess}
                className={`w-full pl-11 pr-24 py-3.5 rounded-xl bg-white/5 border ${
                  error
                    ? "border-red-400/80 ring-2 ring-red-400/20 text-red-200"
                    : isSuccess
                    ? "border-emerald-400 ring-2 ring-emerald-400/20 text-emerald-200"
                    : "border-white/20 focus:border-[#52B788] focus:ring-2 focus:ring-[#52B788]/30 text-white"
                } placeholder-white/30 text-base font-bold tracking-widest uppercase transition outline-none`}
              />
              <button
                type="button"
                onClick={handleQuickFill}
                title="Gunakan kode GURU_HEBAT"
                className="absolute inset-y-1.5 right-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80 transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#52B788]" />
                <span className="hidden sm:inline">Isi Kode</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="flex-1">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Kode valid! Mengalihkan ke aplikasi Siapajar.id...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isVerifying || isSuccess}
            id="btn_submit_access_code"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2D6A4F] to-[#52B788] hover:from-[#1B4332] hover:to-[#40916C] text-white font-extrabold text-sm sm:text-base tracking-wide shadow-lg shadow-[#52B788]/25 transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Terverifikasi</span>
              </>
            ) : (
              <>
                <span>Masuk ke Generator Soal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Access Code Clue / Hint Box */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span className="text-white/40">Kode akses saat ini:</span>
            <span
              onClick={handleQuickFill}
              className="inline-flex items-center font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-[#74C69D] hover:bg-white/20 transition cursor-pointer"
            >
              GURU_HEBAT
            </span>
          </div>
          <span className="text-white/40 text-[11px]">Siapajar.id Asesmen Pintar</span>
        </div>
      </motion.div>
    </div>
  );
}
