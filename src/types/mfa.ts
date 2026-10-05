// ==============================================================================
// BINGO CLUB VNZLA ONLINE — TIPOS DE MFA / TOTP Y STEP-UP AUTHENTICATION (FASE 2.8)
// Cumple con RFC 6238, Supabase Auth MFA y Matriz de Riesgo Server-Authoritative
// ==============================================================================

import type { UserRole } from './database';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type StepUpActionType =
  | 'CHANGE_PAGO_MOVIL'
  | 'REQUEST_WITHDRAWAL'
  | 'ACCOUNT_DELETION'
  | 'CONFIRM_RECHARGE'
  | 'APPROVE_WITHDRAWAL'
  | 'CHANGE_USER_ROLE'
  | 'UPDATE_FINANCIAL_SETTINGS'
  | 'MFA_DISABLE';

export type MfaStatus =
  | 'NOT_ENROLLED'
  | 'ENROLLMENT_PENDING'
  | 'VERIFIED'
  | 'DISABLED'
  | 'RECOVERY_REQUIRED';

export interface MfaFactorInfo {
  id: string;
  friendly_name?: string;
  factor_type: 'totp';
  status: 'unverified' | 'verified';
  created_at: string;
  updated_at: string;
}

export interface StepUpAuthorizationToken {
  authorization_id: string;
  expires_at: string;
  reused?: boolean;
}

export interface StepUpAuthorizationRecord {
  id: string;
  user_id: string;
  action_type: StepUpActionType;
  risk_level: RiskLevel;
  resource_id?: string | null;
  metadata?: Record<string, any>;
  idempotency_key: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  is_used: boolean;
}

export interface RiskMatrixRule {
  actionType: StepUpActionType;
  riskLevel: RiskLevel;
  requiresTotp: boolean;
  requiresRecentAuth: boolean;
  cooldownHours?: number;
  allowedRoles: UserRole[];
  description: string;
  userWarning: string;
}

export interface SecurityEventEntry {
  id: number;
  action: string;
  createdAt: string;
  details: string;
  riskLevel: RiskLevel;
}
