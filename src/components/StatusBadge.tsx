import React from 'react';
import { UserRole, UserStatus } from '../types/auth.types';
import { DrawStatus } from '../types/game.types';

interface StatusBadgeProps {
  type: 'role' | 'user_status' | 'draw_status';
  value: UserRole | UserStatus | DrawStatus;
}

export interface RoleSkinConfig {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
  cardBorder: string;
  accentGradient: string;
}

export function getRoleSkin(role: UserRole): RoleSkinConfig {
  switch (role) {
    case 'SUPER_ADMIN':
      return {
        badgeBg: 'bg-emerald-950/80',
        badgeBorder: 'border-amber-400/70',
        badgeText: 'text-amber-300',
        label: 'Super Admin',
        cardBorder: 'border-amber-500/40',
        accentGradient: 'from-emerald-600 via-amber-500 to-amber-600',
      };
    case 'ADMIN':
      return {
        badgeBg: 'bg-rose-950/80',
        badgeBorder: 'border-rose-500/50',
        badgeText: 'text-rose-300',
        label: 'Administrador',
        cardBorder: 'border-rose-500/30',
        accentGradient: 'from-rose-600 to-amber-500',
      };
    case 'SUPERVISOR':
      return {
        badgeBg: 'bg-indigo-950/80',
        badgeBorder: 'border-indigo-500/50',
        badgeText: 'text-indigo-300',
        label: 'Supervisor',
        cardBorder: 'border-indigo-500/30',
        accentGradient: 'from-indigo-600 to-sky-500',
      };
    case 'OPERATOR':
      return {
        badgeBg: 'bg-sky-950/80',
        badgeBorder: 'border-sky-500/50',
        badgeText: 'text-sky-300',
        label: 'Operador',
        cardBorder: 'border-sky-500/30',
        accentGradient: 'from-sky-600 to-cyan-500',
      };
    case 'PLAYER':
    default:
      return {
        badgeBg: 'bg-slate-900/90',
        badgeBorder: 'border-amber-500/40',
        badgeText: 'text-amber-300',
        label: 'Jugador',
        cardBorder: 'border-slate-800',
        accentGradient: 'from-amber-400 via-amber-500 to-amber-600',
      };
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  if (type === 'role') {
    const skin = getRoleSkin(value as UserRole);

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${skin.badgeBg} ${skin.badgeBorder} ${skin.badgeText} shadow-sm`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        {skin.label}
      </span>
    );
  }


  if (type === 'user_status') {
    const statusStyles: Record<UserStatus, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-emerald-900/40 border-emerald-500/30', text: 'text-emerald-400', label: 'Activo' },
      SUSPENDED: { bg: 'bg-red-900/40 border-red-500/30', text: 'text-red-400', label: 'Suspendido' },
      PENDING_VERIFICATION: { bg: 'bg-amber-900/40 border-amber-500/30', text: 'text-amber-400', label: 'Pendiente' },
      BLOCKED: { bg: 'bg-rose-950 border-rose-700', text: 'text-rose-300', label: 'Bloqueado' },
      BANNED: { bg: 'bg-rose-950 border-rose-700', text: 'text-rose-300', label: 'Baneado' },
    };


    const style = statusStyles[value as UserStatus] || {
      bg: 'bg-slate-800 border-slate-700',
      text: 'text-slate-400',
      label: value,
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text}`}>
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
        {style.label}
      </span>
    );
  }

  // Draw Status
  const drawStyles: Record<DrawStatus, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-300', label: 'Borrador' },
    SCHEDULED: { bg: 'bg-blue-900/40 border-blue-500/30', text: 'text-blue-300', label: 'Programado' },
    READY: { bg: 'bg-cyan-900/40 border-cyan-500/30', text: 'text-cyan-300', label: 'Listo' },
    ACTIVE: { bg: 'bg-amber-500/20 border-amber-500/50', text: 'text-amber-300', label: 'En Vivo' },
    PAUSED: { bg: 'bg-orange-900/40 border-orange-500/30', text: 'text-orange-300', label: 'Pausado' },
    FINISHED: { bg: 'bg-purple-900/40 border-purple-500/30', text: 'text-purple-300', label: 'Finalizado' },
    CANCELLED: { bg: 'bg-red-900/40 border-red-500/30', text: 'text-red-400', label: 'Cancelado' },
    ARCHIVED: { bg: 'bg-zinc-800 border-zinc-700', text: 'text-zinc-400', label: 'Archivado' },
  };

  const style = drawStyles[value as DrawStatus] || {
    bg: 'bg-slate-800 border-slate-700',
    text: 'text-slate-300',
    label: value,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${style.bg} ${style.text}`}>
      {value === 'ACTIVE' && (
        <span className="w-2 h-2 rounded-full mr-1.5 bg-amber-400 animate-pulse" />
      )}
      {style.label}
    </span>
  );
};
