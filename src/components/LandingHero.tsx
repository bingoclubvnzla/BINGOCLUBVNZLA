// BINGO CLUB VNZLA ONLINE — HERO PRINCIPAL
// FASE 1: FUNDACIÓN PROFESIONAL, SEGURA Y REAL

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldCheck,
  Zap,
  Lock,
  Grid,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface LandingHeroProps {
  onOpenAuth: (initialTab: 'login' | 'register') => void;
  onExploreModalities: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenAuth,
  onExploreModalities,
}) => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Fondos y resplandores inspirados en la tricolor venezolana con tonos sobrios y profundos */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-700/20 via-indigo-600/10 to-amber-500/15 blur-[120px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-red-600/10 blur-[100px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge de Estado Actualizado */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold mb-8 shadow-inner shadow-emerald-500/10">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>BINGO CLUB VNZLA ONLINE | PLATAFORMA OFICIAL & SEGURIDAD VERIFICADA</span>
        </div>

        {/* Título Principal y Subtítulo */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-none sm:leading-tight">
          BINGO CLUB <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">VNZLA</span>
        </h1>
        <p className="mt-4 text-xl sm:text-2xl md:text-3xl font-bold text-slate-200 tracking-tight">
          Bingo digital venezolano en tiempo real.
        </p>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          La primera plataforma de entretenimiento digital autoritativa diseñada con la identidad y el calor de Venezuela.
          5 modalidades oficiales, cartones certificados y arquitectura protegida por criptografía.
        </p>

        {/* Aviso de Arquitectura Segura */}
        <div className="mt-6 max-w-xl mx-auto p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 text-slate-300 text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg shadow-black/40">
          <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Juego Seguro y Verificado:</strong> Sistema autoritativo en servidor, validación biométrica/MFA para operaciones sensibles y generador criptográfico CSPRNG.
          </span>
        </div>

        {/* Botones Principales de Llamada a la Acción */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {!user ? (
            <>
              <button
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-black text-slate-950 btn-gaming-gold shine-sweep shadow-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-slate-950 animate-bounce" />
                REGISTRARME
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-slate-100 bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-amber-400/60 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                INICIAR SESIÓN
              </button>
            </>
          ) : (
            <button
              onClick={onExploreModalities}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-black text-slate-950 btn-gaming-gold shine-sweep shadow-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              EXPLORAR SALAS Y MODALIDADES
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onExploreModalities}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl text-sm font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Ver 5 Modalidades Criollas
          </button>
        </div>

        {/* Pilares Técnicos de la Fundación */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-4.5 rounded-2xl glass-card-interactive text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-3 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white">Server Authoritative</h4>
            <p className="text-xs text-slate-400 mt-1">El cliente nunca decide saldo, números ni cartones.</p>
          </div>

          <div className="p-4.5 rounded-2xl glass-card-interactive text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-sm">
              <Grid className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white">5 Modalidades</h4>
            <p className="text-xs text-slate-400 mt-1">Bingo 75, 90, Animalitos, Objetos y Chapitas.</p>
          </div>

          <div className="p-4.5 rounded-2xl glass-card-interactive text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white">Supabase Realtime</h4>
            <p className="text-xs text-slate-400 mt-1">Canales seguros y aislados por sala y jugador.</p>
          </div>

          <div className="p-4.5 rounded-2xl glass-card-interactive text-left">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white">Seguridad RBAC</h4>
            <p className="text-xs text-slate-400 mt-1">5 niveles de acceso con RLS en cada tabla.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
