import React, { useState } from 'react';
import { X, Database, Check, AlertCircle, RefreshCw, Key, ExternalLink, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured, supabaseUrl, setCustomSupabaseCredentials, clearCustomSupabaseCredentials } from '../../lib/supabase';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [urlInput, setUrlInput] = useState(supabaseUrl || '');
  const [keyInput, setKeyInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) return;
    setCustomSupabaseCredentials(urlInput.trim(), keyInput.trim());
    setSavedSuccess(true);
  };

  const handleReset = () => {
    clearCustomSupabaseCredentials();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Estado de Conexión Supabase</h3>
            <p className="text-xs text-slate-400">PostgreSQL, Auth & Realtime Engine</p>
          </div>
        </div>

        {/* Current status pill */}
        <div className={`p-3 rounded-lg border mb-5 flex items-start gap-2.5 text-xs ${
          isSupabaseConfigured 
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' 
            : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
        }`}>
          {isSupabaseConfigured ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">Conexión configurada</p>
                <p className="text-emerald-400/80 mt-0.5 font-mono text-[11px] truncate">
                  Instancia: {supabaseUrl}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">Variables de entorno pendientes</p>
                <p className="text-amber-400/80 mt-0.5">
                  Puedes configurar tus variables en el archivo <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-200">.env</code> o introducir tus claves de proyecto aquí para probar en vivo.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Manual inputs for live testing */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Supabase Anon / Publishable Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              required
            />
            <span className="block text-[11px] text-slate-500 mt-1">
              Nunca ingreses la clave service_role. Solo la clave pública anónima (anon).
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Restablecer a valores .env
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar a esta sesión</span>
              </button>
            </div>
          </div>
        </form>

        {/* Migrations info */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
          <p className="font-semibold text-slate-300 mb-1">Migraciones SQL incluidas en el proyecto:</p>
          <ul className="space-y-1 font-mono text-slate-400">
            <li>• 00001_initial_schema.sql (19 tablas, RBAC, RLS, Triggers)</li>
            <li>• 00002_seed_modalities_and_roles.sql (Bingo 75, 90, Animalitos, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
