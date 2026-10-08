// ==============================================================================
// BINGO CLUB VNZLA ONLINE — TABLERO EN VIVO DE JUGADORES (LIVE PLAYER BOARD)
// Muestra jugadores reales en tiempo real con sus fichas de progreso hacia el Bingo
// 5 Fichas = Bingo / Winner Pending | 4 Fichas = 1 Falta | 3 = Progreso Alto
// ==============================================================================

import React, { useMemo } from 'react';
import { User, Trophy, Flame, Sparkles } from 'lucide-react';

export interface PlayerProgressItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  cardSerial: string;
  matchedCount: number;
  totalNeeded: number;
  tokens: number; // 1 a 5 fichas
  isWinner: boolean;
}

interface LivePlayerBoardProps {
  players: PlayerProgressItem[];
  currentBall?: number | null;
  className?: string;
}

export const LivePlayerBoard: React.FC<LivePlayerBoardProps> = ({
  players,
  currentBall,
  className = '',
}) => {
  // Ordenar por fichas y coincidencias descendente
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.isWinner !== a.isWinner) return b.isWinner ? 1 : -1;
      if (b.tokens !== a.tokens) return b.tokens - a.tokens;
      return b.matchedCount - a.matchedCount;
    });
  }, [players]);

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 shadow-2xl ${className}`}>
      {/* CABECERA */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
              Tablero en Vivo de Jugadores
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Progreso real de cartones hacia el Bingo</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-amber-400 font-bold">
            {players.length} {players.length === 1 ? 'Jugador' : 'Jugadores'}
          </span>
        </div>
      </div>

      {/* LISTA DE JUGADORES */}
      {sortedPlayers.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          Esperando que los jugadores adquieran cartones para este sorteo...
        </div>
      ) : (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {sortedPlayers.map((player) => {
            const isTopCandidate = player.tokens >= 4;

            return (
              <div
                key={`${player.userId}-${player.cardSerial}`}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  player.isWinner
                    ? 'border-amber-400/80 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 shadow-md shadow-amber-500/10 animate-pulse'
                    : isTopCandidate
                    ? 'border-amber-500/30 bg-slate-950/70 hover:border-amber-500/50'
                    : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                {/* IDENTIDAD DEL JUGADOR */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={player.displayName}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {player.isWinner && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                        <Trophy className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 truncate font-display">
                        {player.displayName}
                      </span>
                      {isTopCandidate && !player.isWinner && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ¡A 1 BOLA!
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Cartón #{player.cardSerial}
                    </span>
                  </div>
                </div>

                {/* FICHAS DE PROGRESO (1 a 5 fichas amarillas / blancas) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((tokenIdx) => {
                      const isActive = tokenIdx <= player.tokens;
                      return (
                        <div
                          key={tokenIdx}
                          className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full transition-all duration-300 ${
                            isActive
                              ? 'dauber-marked-gold scale-110 shadow-sm border border-amber-200'
                              : 'bg-slate-800 border border-slate-700/80'
                          }`}
                          title={`Ficha ${tokenIdx}`}
                        />
                      );
                    })}
                  </div>

                  <span className="text-[10px] font-mono font-bold text-slate-300 w-8 text-right">
                    {player.matchedCount}/{player.totalNeeded}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
