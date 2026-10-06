/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - Game Domain Types
 */

import { ModalityCode, DrawStatus } from './database.types';

export type { ModalityCode };

export interface AnimalitoItem {
  num: number | string;
  name: string;
  emoji: string;
}

export interface PopularObjectItem {
  id: number;
  name: string;
  emoji: string;
}

export interface ModalityDetails {
  code: ModalityCode;
  name: string;
  subtitle: string;
  description: string;
  gridRows: number;
  gridCols: number;
  hasFreeCenter: boolean;
  totalNumbers: number;
  layoutDescription: string;
  rulesSummary: string[];
  patterns: string[];
}

export interface CardCell {
  row: number;
  col: number;
  value: number | string | null;
  label?: string;
  emoji?: string;
  isFree: boolean;
  marked?: boolean;
}

export interface DemoCard {
  id: string;
  modalityCode: ModalityCode;
  cardSerial: string;
  grid: CardCell[][];
}

export const DRAW_STATE_MACHINE: Record<DrawStatus, DrawStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['READY', 'CANCELLED'],
  READY: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'FINISHED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  FINISHED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [], // Terminal state
};

export function isValidDrawTransition(from: DrawStatus, to: DrawStatus): boolean {
  if (from === to) return true;
  const allowed = DRAW_STATE_MACHINE[from];
  return allowed ? allowed.includes(to) : false;
}
