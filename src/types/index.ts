// ============================================================================
// BINGO CLUB VNZLA ONLINE — TIPOS TYPESCRIPT ESTRICTOS (FASE 1)
// ============================================================================

export type AppRole = 'PLAYER' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'BANNED';

export type DrawStatus = 
  | 'DRAFT'
  | 'SCHEDULED'
  | 'READY'
  | 'ACTIVE'
  | 'PAUSED'
  | 'FINISHED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type TransactionType = 
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'CARD_PURCHASE'
  | 'PRIZE_PAYOUT'
  | 'REFUND'
  | 'ADJUSTMENT';

export type TransactionStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type PaymentMethod = 
  | 'PAGO_MOVIL'
  | 'BINANCE_PAY'
  | 'TRANSFERENCIA_BANCARIA'
  | 'EFECTIVO';

export interface UserProfile {
  id: string;
  user_id: string;
  public_id: string;
  display_name: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  status: UserStatus;
  role: AppRole;
  security_level: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  actor_role: AppRole;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type ModalityId = 'BINGO_75' | 'BINGO_90' | 'ANIMALITOS' | 'OBJETOS' | 'CHAPITAS';

export interface GameModality {
  id: ModalityId;
  name: string;
  description: string;
  grid_rows: number;
  grid_cols: number;
  free_center: boolean;
  total_balls: number;
  layout_config: {
    columns?: string[] | number;
    ranges?: [number, number][];
    free_cell?: [number, number];
    theme?: string;
    numbers_per_row?: number;
    total_numbers?: number;
    elements?: string[];
    [key: string]: unknown;
  };
  is_active: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  modality_id: ModalityId;
  min_players: number;
  max_players: number;
  is_private: boolean;
  access_code?: string | null;
  status: 'OPEN' | 'IN_GAME' | 'CLOSED';
  created_at: string;
}

export interface Draw {
  id: string;
  room_id: string;
  modality_id: ModalityId;
  draw_number: number;
  status: DrawStatus;
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  ball_sequence: number[];
  server_seed_hash?: string | null;
  total_cards_sold: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  draw_id: string;
  user_id: string;
  serial_number: string;
  matrix: (number | string | null)[][];
  purchase_price: number;
  status: 'ACTIVE' | 'CANCELLED';
  created_at: string;
}

export interface Wallet {
  user_id: string;
  balance_ves: number;
  balance_usdt: number;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  idempotency_key: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: 'VES' | 'USDT';
  balance_before: number;
  balance_after: number;
  reference_id?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  idempotency_key: string;
  method: PaymentMethod;
  amount: number;
  currency: 'VES' | 'USDT';
  bank_origin?: string | null;
  bank_destination?: string | null;
  reference_number: string;
  proof_url?: string | null;
  status: TransactionStatus;
  operator_id?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export interface OperatorAction {
  id: string;
  operator_id: string;
  action_type: string;
  target_user_id?: string | null;
  target_entity: string;
  target_id?: string | null;
  rationale: string;
  created_at: string;
}
