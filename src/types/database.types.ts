/**
 * Tipos de Base de Datos - Bingo Club Vnzla Online (Fase 1)
 * Mapeo 1:1 con el esquema PostgreSQL y Row Level Security
 */

export type UserRole = 'PLAYER' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'BLOCKED' | 'PENDING_VERIFICATION';

export type ModalityCode = 'BINGO_75' | 'BINGO_90' | 'ANIMALITOS' | 'OBJETOS' | 'CHAPITAS';

export type DrawStatus = 
  | 'DRAFT' 
  | 'SCHEDULED' 
  | 'READY' 
  | 'ACTIVE' 
  | 'PAUSED' 
  | 'FINISHED' 
  | 'CANCELLED' 
  | 'ARCHIVED';

export type CardStatus = 'AVAILABLE' | 'RESERVED' | 'ASSIGNED' | 'PLAYED' | 'VOID';

export type TransactionType = 
  | 'DEPOSIT' 
  | 'WITHDRAWAL' 
  | 'CARD_PURCHASE' 
  | 'PRIZE_PAYOUT' 
  | 'SYSTEM_ADJUSTMENT' 
  | 'REFUND';

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface Profile {
  id: string;
  user_id: string;
  public_id?: string; // Formato BCV-XXXXXX
  public_code?: string; // Alias de compatibilidad
  display_name: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  status: UserStatus;
  role: UserRole;
  security_level?: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ProfileRow = Profile;
export type UserProfile = Profile;

export interface GameModality {
  id: string;
  code?: ModalityCode;
  name: string;
  grid_rows: number;
  grid_cols: number;
  has_free_center: boolean;
  free_center?: boolean;
  total_numbers?: number;
  number_min?: number;
  number_max?: number;
  description: string | null;
  is_active: boolean;
  config?: Record<string, unknown>;
  total_balls?: number;
  max_ball_number?: number;
  card_numbers_count?: number;
  pattern_rules?: { patterns: string[] } | string[] | Record<string, unknown>;
  created_at?: string;
}

export interface GameRoom {
  id: string;
  name: string;
  slug: string;
  modality_id: string;
  is_active: boolean;
  max_players: number;
  created_at: string;
}

export interface Draw {
  id: string;
  room_id: string;
  draw_number: number;
  draw_code?: string;
  title?: string;
  status: DrawStatus;
  scheduled_at: string | null;
  scheduled_for?: string | null;
  started_at: string | null;
  finished_at: string | null;
  server_seed: string | null;
  total_drawn_numbers: number[];
  current_number: number | null;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface DrawEvent {
  id: string;
  draw_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  sequence_number: number;
  created_at: string;
}

export interface Card {
  id: string;
  draw_id: string;
  user_id: string | null;
  owner_id?: string | null;
  card_number: number;
  serial_number?: string;
  card_serial?: string;
  status: CardStatus;
  matrix?: (number | string)[][];
  grid_layout?: (number | string | null)[][];
  checksum?: string;
  integrity_hash?: string;
  modality_id?: string;
  price?: number;
  purchased_at: string | null;
  created_at: string;
}


export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
  currency: string;
  is_active: boolean; // En Fase 1: FALSE
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  currency: string;
  idempotency_key: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type WalletTransactionRow = WalletTransaction;

export interface AuditLog {
  id: string;
  user_id: string | null;
  actor_role: UserRole;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  updated_by: string | null;
}
