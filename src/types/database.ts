// ==============================================================================
// BINGO CLUB VNZLA ONLINE — TIPOS ESTRICTOS DE BASE DE DATOS Y DOMINIO
// ==============================================================================

export type UserRole = 'PLAYER' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';
export type AppRole = UserRole;

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export type DrawStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'READY'
  | 'ACTIVE'
  | 'PAUSED'
  | 'FINISHED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type ModalityCode =
  | 'BINGO_75'
  | 'BINGO_90'
  | 'ANIMALITOS'
  | 'OBJETOS'
  | 'CHAPITAS';

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
  | 'SETTLED';

export interface UserProfile {
  id: string; // auth.users UUID
  user_id?: string; // alias compatible
  public_id: string; // BCV-XXXXXX
  public_code?: string; // alias compatible
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  national_id?: string | null;
  is_identity_locked?: boolean;
  identity_locked_at?: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  security_level: number;
  created_at: string;
  updated_at: string;
}

export type TicketSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus =
  | 'NEW'
  | 'TRIAGED'
  | 'QUEUED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_USER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export interface SupportTicket {
  id: string;
  player_id: string;
  subject: string;
  category: string;
  severity: TicketSeverity;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_agent: string | null;
  queue_position: number;
  estimated_wait_seconds: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  first_response_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string | null;
}

export interface SupportFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface OrchestratorLease {
  id: string;
  current_draw_id: string | null;
  current_phase: 'WAITING' | 'PREPARING' | 'SALES_OPEN' | 'SALES_CLOSING' | 'SALES_CLOSED' | 'VALIDATING' | 'READY' | 'ACTIVE' | 'PAUSED' | 'WINNER_PENDING' | 'FINISHED' | 'SETTLEMENT' | 'WAITING_NEXT' | 'CANCELLED';
  phase_started_at: string;
  phase_ends_at: string;
  active_worker_id: string | null;
  heartbeat_at: string;
  cycle_counter: number;
  metadata: Record<string, any>;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface GameModality {
  id: ModalityCode;
  code?: string;
  name: string;
  description: string;
  grid_rows: number;
  grid_cols: number;
  has_free_center: boolean;
  free_center?: boolean;
  total_balls: number;
  max_ball_number?: number;
  card_numbers_count?: number;
  pattern_rules?: string[];
  number_range_min?: number;
  number_range_max?: number;
  display_order?: number;
  config: {
    column_ranges?: Record<string, [number, number]>;
    theme?: string;
    items?: string[];
    winning_patterns?: string[];
    numbers_per_card?: number;
    numbers_per_row?: number;
  };
  is_active: boolean;
  created_at?: string;
}

export interface GameRoom {
  id: string;
  code: string;
  name: string;
  modality_id: ModalityCode;
  max_players: number;
  is_private: boolean;
  status: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';
  created_at: string;
}

export interface Draw {
  id: string;
  room_id: string;
  modality_id: ModalityCode;
  title: string;
  draw_number: number;
  status: DrawStatus;
  version: number;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  drawn_numbers: number[];
  card_price?: number;
  max_cards_per_player?: number;
  total_cards_available?: number;
  total_cards_sold?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  idempotency_key: string;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: TransactionStatus;
  reference_code: string | null;
  previous_hash: string | null;
  transaction_hash: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Card {
  id: string;
  draw_id: string;
  user_id: string;
  card_serial: string;
  card_number?: number;
  grid_layout: (number | string | null)[][];
  status: 'ISSUED' | 'PLAYING' | 'WON' | 'CANCELLED';
  purchased_at: string;
  modality_id?: ModalityCode | string;
  price?: number;
  purchase_id?: string;
  integrity_hash?: string;
  locked_at?: string | null;
  card_numbers?: Array<{
    number_value: number;
    row_pos: number;
    col_pos: number;
    is_marked?: boolean;
  }>;
}

export interface CardPurchase {
  id: string;
  user_id: string;
  draw_id: string;
  modality_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  idempotency_key: string;
  card_ids: string[];
  card_serials: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  currency: string;
  balance_available: number;
  balance_locked: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED_PHASE_1';
  created_at: string;
  updated_at: string;
}

export interface PlatformPhaseInfo {
  phase: number;
  phase_name: string;
  financial_operations_active: boolean;
  mode: 'TEST_MODE' | 'PRODUCTION';
  message: string;
}

export interface FinancialConfig {
  id: string;
  version: number;
  name: string;
  description?: string;
  is_active: boolean;
  prize_pool_percent: number;
  platform_revenue_percent: number;
  jackpot_pool_percent: number;
  operational_fee_percent: number;
  withdrawal_fee_percent: number;
  withdrawal_fixed_fee: number;
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  min_card_purchase: number;
  max_cards_per_player: number;
  effective_from: string;
  effective_until?: string | null;
}

export interface PurchaseQuote {
  quote_id: string;
  draw_id: string;
  modality_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total_amount: number;
  currency: string;
  config_version: number;
  distribution: {
    prize_pool_percent: number;
    prize_pool_amount: number;
    platform_percent: number;
    platform_amount: number;
    jackpot_percent: number;
    jackpot_amount: number;
    operational_percent: number;
  };
  expires_at: string;
  ttl_seconds: number;
}

export interface DrawFinancialSettlement {
  id: string;
  draw_id: string;
  config_version: number;
  total_cards_sold: number;
  card_unit_price: number;
  gross_sales: number;
  net_sales: number;
  prize_pool_allocated: number;
  platform_revenue_allocated: number;
  jackpot_pool_allocated: number;
  operational_costs_allocated: number;
  prizes_awarded_count: number;
  prizes_paid_amount: number;
  settlement_status: 'PENDING' | 'CALCULATED' | 'RECONCILED' | 'EXCEPTION';
  reconciliation_diff: number;
  settled_at?: string;
  created_at: string;
}

export interface PlatformRevenueEntry {
  id: string;
  draw_id?: string;
  revenue_type: 'DRAW_RAKE' | 'WITHDRAWAL_FEE' | 'INACTIVITY_FEE' | 'OTHER';
  amount: number;
  currency: string;
  reference_code: string;
  description: string;
  metadata?: Record<string, any>;
  recorded_at: string;
}

export interface JackpotPoolEntry {
  id: string;
  entry_type: 'CONTRIBUTION' | 'PAYOUT' | 'INITIAL_SEED' | 'ADJUSTMENT';
  draw_id?: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  currency: string;
  reference_code: string;
  notes?: string;
  recorded_at: string;
}

export interface FinancialReconciliation {
  id: string;
  reconciliation_type: 'DAILY' | 'DRAW' | 'WEEKLY' | 'MANUAL';
  period_start: string;
  period_end: string;
  total_sales: number;
  total_prizes: number;
  total_revenue: number;
  total_jackpot: number;
  total_costs: number;
  discrepancy_amount: number;
  is_balanced: boolean;
  exceptions_count: number;
  executed_by?: string;
  summary: Record<string, any>;
  created_at: string;
}

export interface FinancialException {
  id: string;
  reconciliation_id: string;
  exception_code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entity_type: string;
  entity_id: string;
  description: string;
  expected_amount?: number;
  actual_amount?: number;
  discrepancy?: number;
  is_resolved: boolean;
  resolution_notes?: string;
  created_at: string;
}

