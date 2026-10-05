import type { UserRole } from '../types/database.types';

/**
 * Topología de Canales Realtime - Bingo Club Vnzla Online
 */
export const CHANNELS = {
  room: (roomId: string) => `room:${roomId}`,
  draw: (drawId: string) => `draw:${drawId}`,
  player: (userId: string) => `player:${userId}`,
  operator: (operatorId: string) => `operator:${operatorId}`,
};

export interface ChannelAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validador de Autorización de Canales Realtime
 * Previene que jugadores escuchen información privada de otros o canales de operadores
 */
export function canSubscribeToChannel(
  channelName: string,
  user: { id: string; role: UserRole } | null
): ChannelAccessResult {
  // Canales públicos de salas y sorteos
  if (channelName.startsWith('room:') || channelName.startsWith('draw:')) {
    return { allowed: true };
  }

  // Si no está autenticado, no puede suscribirse a canales privados
  if (!user) {
    return { allowed: false, reason: 'DEBE_INICIAR_SESION' };
  }

  // Canales privados de jugador
  if (channelName.startsWith('player:')) {
    const targetUserId = channelName.replace('player:', '');
    if (user.id === targetUserId || ['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'ACCESO_DENEGADO_CANAL_PRIVADO_AJENO' };
  }

  // Canales de operadores
  if (channelName.startsWith('operator:')) {
    if (['OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'ROL_INSUFICIENTE_PARA_CANAL_OPERADOR' };
  }

  return { allowed: false, reason: 'CANAL_NO_RECONOCIDO' };
}
