// =====================================================================
// BINGO CLUB VNZLA ONLINE - ESPECIFICACIÓN DE EVENTOS REALTIME
// =====================================================================

import type { DrawStatus } from './database';

export type RealtimeChannelPrefix = 'room' | 'draw' | 'player' | 'operator';

export interface RoomPresenceState {
  userId: string;
  publicId: string;
  joinedAt: string;
}

export interface DrawBallEventPayload {
  drawId: string;
  ball: number;
  sequenceNumber: number;
  remainingBalls: number;
  timestamp: string;
}

export interface DrawStatusEventPayload {
  drawId: string;
  previousStatus: DrawStatus;
  newStatus: DrawStatus;
  timestamp: string;
}

export interface WinnerClaimedEventPayload {
  drawId: string;
  cardId: string;
  winnerPublicId: string;
  prizePattern: string;
  winningBall: number;
}
