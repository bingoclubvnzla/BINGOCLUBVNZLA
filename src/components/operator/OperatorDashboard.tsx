import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  Lock,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const OperatorDashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const [activeModule, setActiveModule] = useState<
    'recargas' | 'pagos' | 'retiros' | 'jugadores' | 'incidencias' | 'auditoria'
  >('jugadores');

  const [searchCode, setSearchCode] = useState('');

  // Demostración de estructura de consulta de jugadores por código anónimo BCV
  const samplePlayers = [
    { code: 'BCV-784920', alias: 'ElLlanero77', status: 'ACTIVE', role: 'PLAYER', registered: '2026-10-01' },
    { code: 'BCV-312948', alias: 'GuaricoSuerte', status: 'ACTIVE', role: 'PLAYER', registered: '2026-10-02' },
    { code: 'BCV-901452', alias: 'MaracuchoBingo', status: 'ACTIVE', role: 'PLAYER', registered: '2026-10-03' },
    { code: 'BCV-549102', alias: 'CaracasPlay', status: 'ACTIVE', role: 'PLAYER', registered: '2026-10-04' },
  ];

  const filteredPlayers = samplePlayers.filter(
    (p) =>
      p.code.toLowerCase().includes(searchCode.toLowerCase()) ||
      p.alias.toLowerCase().includes(searchCode.toLowerCase())
  );

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              PANEL OPERATIVO
            </span>
            <span className="text-slate-400 text-xs">| Rol Activo: {role}</span>
          </div>
          <h1 className="text-2xl font-black text-white">Panel de Operador</h1>
          <p className="text-xs text-slate-400">
            Supervisión técnica de salas, incidencias y gestión de jugadores
          </p>
        </div>

        {/* Financial State Warning - Mandatory Compliance */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-amber-300 block">
              Sin operaciones financieras activadas
            </span>
            <span className="text-[11px] text-amber-400/80 block">
              Fase 1: Módulos de caja bloqueados contra manipulación o simulación
            </span>
          </div>
        </div>
      </div>

      {/* Modules Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
        <button
          onClick={() => setActiveModule('recargas')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
            activeModule === 'recargas'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Recargas</span>
        </button>

        <button
          onClick={() => setActiveModule('pagos')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
            activeModule === 'pagos'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Pagos</span>
        </button>

        <button
          onClick={() => setActiveModule('retiros')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
            activeModule === 'retiros'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Retiros</span>
        </button>

        <button
          onClick={() => setActiveModule('jugadores')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
            activeModule === 'jugadores'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Jugadores</span>
        </button>

        <button
          onClick={() => setActiveModule('incidencias')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
            activeModule === 'incidencias'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Incidencias</span>
        </button>

        <button
          onClick={() => setActiveModule('auditoria')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
            activeModule === 'auditoria'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Auditoría</span>
        </button>
      </div>

      {/* Module 1: Recargas (Protected Status) */}
      {activeModule === 'recargas' && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto space-y-3">
          <Lock className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Módulo de Recargas (Pago Móvil / Binance Pay)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Las funciones financieras se encuentran bloqueadas formalmente en esta Fase 1. En la siguiente fase se habilitará el flujo de verificación de referencias bancarias con doble control de operador e idempotencia.
          </p>
          <span className="inline-block px-3 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-400">
            ESTADO: INACTIVO_POR_POLITICA_FASE_1
          </span>
        </div>
      )}

      {/* Module 2: Pagos (Protected Status) */}
      {activeModule === 'pagos' && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto space-y-3">
          <Lock className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Módulo de Pagos a Premiados</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sin operaciones financieras activadas. Los premios reales y liquidaciones de fondos se incorporarán tras la certificación de la máquina de sorteos en Fase 2 y 3.
          </p>
          <span className="inline-block px-3 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-400">
            ESTADO: INACTIVO_POR_POLITICA_FASE_1
          </span>
        </div>
      )}

      {/* Module 3: Retiros (Protected Status) */}
      {activeModule === 'retiros' && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto space-y-3">
          <Lock className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Módulo de Solicitudes de Retiro</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sin operaciones financieras activadas. Las solicitudes de retiro requerirán validación 2FA por parte del usuario y aprobación multi-firma de supervisión en fases futuras.
          </p>
          <span className="inline-block px-3 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-400">
            ESTADO: INACTIVO_POR_POLITICA_FASE_1
          </span>
        </div>
      )}

      {/* Module 4: Jugadores (Real Consultation by Anonymous Code) */}
      {activeModule === 'jugadores' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Directorio de Jugadores</h3>
              <p className="text-xs text-slate-400">
                Consulta de identificadores públicos BCV sin revelación de datos personales sensibles
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Buscar por código o apodo..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Código BCV</th>
                  <th className="py-2.5 px-3">Apodo</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Rol</th>
                  <th className="py-2.5 px-3">Registro</th>
                  <th className="py-2.5 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPlayers.map((player) => (
                  <tr key={player.code} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{player.code}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{player.alias}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        {player.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{player.role}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{player.registered}</td>
                    <td className="py-2.5 px-3">
                      <button
                        title="Ver ficha anónima"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                      >
                        Inspeccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Module 5: Incidencias */}
      {activeModule === 'incidencias' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Bitácora de Incidencias Operativas</h3>
            <p className="text-xs text-slate-400">
              Reportes de sala, desconexiones o consultas técnicas en curso
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <div>
                <span className="font-bold text-white">Todas las salas funcionando normalmente</span>
                <p className="text-[11px] text-slate-500">Sin alertas críticas registradas en la máquina de estados</p>
              </div>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">En línea</span>
          </div>
        </div>
      )}

      {/* Module 6: Auditoría */}
      {activeModule === 'auditoria' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Registro de Auditoría de Sala</h3>
            <p className="text-xs text-slate-400">
              Trazabilidad de operaciones ejecutadas por operadores en turno
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-400">OPERATOR_LOGIN</span>
                <span className="text-slate-400 text-[11px] ml-2">Sesión operativa iniciada</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">Reciente</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
