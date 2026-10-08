import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured, RealtimeChannels } from '../lib/supabase';
import { StatusBadge } from '../components/StatusBadge';
import { Draw, BingoCard } from '../types/game.types';
import {
  Wallet,
  Calendar,
  Layers,
  History,
  Shield,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PlayerDashboardProps {
  onNavigate: (view: string) => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ onNavigate }) => {
  const { user, profile, role, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'draws' | 'cards' | 'history'>('draws');
  const [draws, setDraws] = useState<Draw[]>([]);
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setLoadingData(false);
      return;
    }

    const currentUserId = user.id;
    let isMounted = true;

    async function loadPlayerData() {
      setLoadingData(true);
      try {
        // Fetch active/scheduled draws
        const { data: drawsData } = await supabase
          .from('draws')
          .select('*')
          .in('status', ['SCHEDULED', 'READY', 'ACTIVE', 'PAUSED'])
          .order('created_at', { ascending: false });

        if (isMounted && drawsData) {
          setDraws(drawsData as Draw[]);
        }

        // Fetch user's owned cards
        const { data: cardsData } = await supabase
          .from('cards')
          .select('*')
          .eq('owner_id', currentUserId)
          .order('created_at', { ascending: false });

        if (isMounted && cardsData) {
          setCards(cardsData as BingoCard[]);
        }
      } catch (err) {
        console.warn('Notice loading dashboard data:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadPlayerData();

    // Subscribe to private player realtime channel
    const playerChannel = RealtimeChannels.player(currentUserId);
    playerChannel
      .on('broadcast', { event: 'notification' }, (payload: any) => {
        console.log('Player realtime notification received:', payload);
      })
      .subscribe();


    return () => {
      isMounted = false;
      supabase.removeChannel(playerChannel);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* User Identity Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : 'J'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-white">{profile?.full_name || 'Jugador'}</h1>
                <StatusBadge type="role" value={role} />
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                <span>Identificador Público:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                  {profile?.public_id || 'BCV-PENDING'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center text-emerald-400">
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Estado: {profile?.status || 'ACTIVO'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('profile')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Configurar Perfil
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-300 text-xs font-semibold rounded-xl border border-red-800/40 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Financial Notice & Wallet Module (Strict requirement: NO fake balances) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billetera de Jugador</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                <Lock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-200">Función financiera próximamente disponible.</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  En cumplimiento con la Fase 1, las transacciones financieras y recargas en moneda real permanecen deshabilitadas.
                </p>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Integración Fase 2:</span>
              <span className="text-amber-400 font-semibold">Pago Móvil & Binance Pay</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seguridad Criptográfica</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Nivel de Seguridad</span>
                  <span className="font-bold text-emerald-400">Nivel {profile?.security_level || 1}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Autoridad del Sorteo</span>
                  <span className="font-bold text-amber-400">Server-Authoritative</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Protección de Datos</span>
                  <span className="font-bold text-blue-400">RLS Activo</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-slate-500">
              ID privado seguro vinculado a PostgreSQL auth.users
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modalidades Activas</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Explora los formatos venezolanos configurados: Bingo 75, Bingo 90, Animalitos, Objetos y Chapitas.
              </p>
              <button
                onClick={() => onNavigate('modalities')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
              >
                Ver Catálogo de Modalidades
              </button>
            </div>
            <div className="mt-4 text-[11px] text-slate-500">
              Esquemas matemáticos listos para sorteo
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-800 flex space-x-6">
          <button
            onClick={() => setActiveTab('draws')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'draws'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Mis Sorteos</span>
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'cards'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mis Cartones</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'draws' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-white">Sorteos Oficiales Programados</h3>
              <span className="text-xs text-slate-400">Total activos: {draws.length}</span>
            </div>

            {loadingData ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Cargando sorteos desde PostgreSQL...</span>
              </div>
            ) : draws.length === 0 ? (
              <div className="py-12 text-center text-slate-400 max-w-md mx-auto">
                <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">No hay sorteos programados en este momento</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Los operadores y administradores crearán sorteos en las salas disponibles. Puedes revisar las modalidades de juego.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draws.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-amber-400 font-bold">{d.draw_code}</span>
                      <StatusBadge type="draw_status" value={d.status} />
                    </div>
                    <h5 className="font-bold text-white text-sm mb-1">{d.title}</h5>
                    <p className="text-xs text-slate-400">
                      Fecha: {d.scheduled_for ? new Date(d.scheduled_for).toLocaleString() : 'Por definir'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-white">Mis Cartones Registrados</h3>
              <span className="text-xs text-slate-400">Total asignados: {cards.length}</span>
            </div>

            {loadingData ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Cargando cartones...</span>
              </div>
            ) : cards.length === 0 ? (
              <div className="py-12 text-center text-slate-400 max-w-md mx-auto">
                <Layers className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">Aún no posees cartones registrados</h4>
                <p className="text-xs text-slate-500 mt-1">
                  En la Fase 1, la emisión de cartones se efectúa bajo salas de prueba server-authoritative.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cards.map((card) => (
                  <div key={card.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{card.serial_number}</span>
                      <span className="text-[11px] font-semibold text-emerald-400">{card.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Checksum: <span className="font-mono">{card.checksum}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Historial de Operaciones</h3>
              <span className="text-xs text-slate-400">Libro mayor inmutable</span>
            </div>
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Sin movimientos registrados</p>
              <p className="mt-1">
                La tabla de transacciones de billetera está protegida contra simulación ficticia.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
