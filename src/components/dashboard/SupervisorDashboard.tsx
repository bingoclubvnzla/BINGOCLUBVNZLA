// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PANEL SUPERVISOR DEDICADO (FASE 2.9)
// Jerarquía: SUPERVISOR (Nivel 30) — Intermedio entre ADMIN y OPERATOR
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  AlertTriangle,
  Lock,
  RefreshCw,
  Users
} from 'lucide-react';
import { StepUpAuthModal } from '../mfa/StepUpAuthModal';
import type { StepUpAuthorizationToken } from '../../types/mfa';

interface SupervisorDashboardProps {
  onEnterLiveRoom?: (modalityId: string) => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ onEnterLiveRoom }) => {
  const { user, profile, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'supervision' | 'operations' | 'audit'>('supervision');
  const [loading, setLoading] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Operaciones simuladas bajo revisión de supervisor
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: 'OP-REV-001',
      type: 'RECARGA_ALTO_VALOR',
      amount: 'Bs. 5,000.00',
      operator: 'bingobingovnz@gmail.com',
      reference: '0102-99882211',
      player: 'BCV-JUG881',
      status: 'REQUIERE_SEGUNDA_APROBACION',
      created_at: new Date(Date.now() - 15 * 60000).toLocaleTimeString(),
    },
    {
      id: 'OP-REV-002',
      type: 'RETIRO_SENSIBLE',
      amount: 'Bs. 2,400.00',
      operator: 'bingobingovnz@gmail.com',
      reference: '0108-44332211',
      player: 'BCV-PLA409',
      status: 'REQUIERE_SEGUNDA_APROBACION',
      created_at: new Date(Date.now() - 45 * 60000).toLocaleTimeString(),
    },
  ]);

  const handleApprove = (op: any) => {
    setSelectedOperation(op);
    setStepUpOpen(true);
  };

  const handleStepUpSuccess = async (_token: StepUpAuthorizationToken) => {
    setStepUpOpen(false);
    if (selectedOperation) {
      setLoading(true);
      setTimeout(() => {
        setPendingApprovals((prev) => prev.filter((p) => p.id !== selectedOperation.id));
        setFeedback(`Operación ${selectedOperation.id} aprobada con éxito por SUPERVISOR tras validar segundo factor.`);
        setSelectedOperation(null);
        setLoading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Consola de Supervisión Operativa (Fase 2.9)</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white font-display">
              Panel de SUPERVISOR
            </h1>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>Identidad: <strong className="text-white">{user?.email || 'supervisor@bingoclubvnzla.vercel.app'}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Jerarquía: <strong className="text-sky-400">SUPERVISOR (Nivel 30)</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEnterLiveRoom && (
              <button
                onClick={() => onEnterLiveRoom('BINGO_75')}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
              >
                Supervisar Sorteo en Vivo
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        {/* MÉTRICAS DE SUPERVISIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Operadores Activos</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">1 en línea</div>
            <div className="text-[11px] text-slate-500 mt-1">bingobingovnz@gmail.com</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Operaciones en Revisión (2da Aprobación)</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{pendingApprovals.length}</div>
            <div className="text-[11px] text-amber-400 mt-1">Requieren Step-Up TOTP</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">Estado de Sorteos</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">Normal</div>
            <div className="text-[11px] text-slate-500 mt-1">Validación criptográfica server-side</div>
          </div>
        </div>

        {/* LISTADO DE OPERACIONES PARA SEGUNDA APROBACIÓN */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <span>Cola de Operaciones de Alto Valor (Separación de Funciones)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Operaciones preparadas por operadores que exigen segunda aprobación de supervisor con MFA.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              No hay operaciones pendientes de segunda revisión.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ID Operación</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Monto</th>
                    <th className="py-3 px-4">Jugador</th>
                    <th className="py-3 px-4">Operador Iniciador</th>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {pendingApprovals.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-white">{op.id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {op.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{op.amount}</td>
                      <td className="py-3 px-4 text-slate-300">{op.player}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans">{op.operator}</td>
                      <td className="py-3 px-4 text-slate-500">{op.created_at}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleApprove(op)}
                          disabled={loading}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors cursor-pointer"
                        >
                          APROBAR CON TOTP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <StepUpAuthModal
        isOpen={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        actionType="APPROVE_WITHDRAWAL"
        onSuccess={handleStepUpSuccess}
      />
    </div>
  );
};
