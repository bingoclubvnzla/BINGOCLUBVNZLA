// ==============================================================================
// BINGO CLUB VNZLA ONLINE — CONSTANTES DE EVENTOS REALTIME (FASE 2)
// Regla: Nombres de eventos centralizados como constantes inmutables.
// ==============================================================================

export const DRAW_REALTIME_EVENTS = {
  DRAW_CREATED: 'DRAW_CREATED',
  DRAW_READY: 'DRAW_READY',
  DRAW_STARTED: 'DRAW_STARTED',
  BALL_DRAWN: 'BALL_DRAWN',
  DRAW_PAUSED: 'DRAW_PAUSED',
  DRAW_RESUMED: 'DRAW_RESUMED',
  DRAW_FINISHED: 'DRAW_FINISHED',
  DRAW_CANCELLED: 'DRAW_CANCELLED',
  SNAPSHOT_AVAILABLE: 'SNAPSHOT_AVAILABLE',
  HEARTBEAT_PING: 'HEARTBEAT_PING',
  HEARTBEAT_PONG: 'HEARTBEAT_PONG',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT',
} as const;

export type DrawRealtimeEventType = typeof DRAW_REALTIME_EVENTS[keyof typeof DRAW_REALTIME_EVENTS];

export type ConnectionStatus =
  | 'EN_VIVO'
  | 'SINCRONIZANDO'
  | 'RECONEXION'
  | 'DESCONECTADO';

export interface DrawSnapshot {
  draw_id: string;
  public_code: string;
  room_id: string;
  modality_id: 'BINGO_75' | 'BINGO_90' | 'ANIMALITOS' | 'OBJETOS' | 'CHAPITAS';
  title: string;
  status: 'DRAFT' | 'SCHEDULED' | 'READY' | 'ACTIVE' | 'PAUSED' | 'FINISHED' | 'CANCELLED' | 'ARCHIVED';
  version: number;
  total_balls: number;
  drawn_numbers: number[];
  current_ball: number | null;
  current_sequence: number;
  last_event_hash: string;
  server_time: string;
  players_connected: number;
  players_registered: number;
  history: Array<{
    sequence_number: number;
    ball_number: number;
    name?: string;
    letter?: string;
    asset_key?: string;
    event_hash: string;
    timestamp: string;
  }>;
}

export interface DrawEventPayload {
  id: string;
  draw_id: string;
  sequence_number: number;
  event_type: DrawRealtimeEventType;
  ball_number?: number;
  ball_name?: string;
  ball_letter?: string;
  asset_key?: string;
  previous_event_hash: string;
  event_hash: string;
  created_at: string;
  created_by: string; // Server authority ID
  version: number;
}
