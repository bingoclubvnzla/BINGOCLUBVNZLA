// ==============================================================================
// BINGO CLUB VNZLA ONLINE — ORQUESTADOR AUTÓNOMO SERVER-AUTHORITATIVE
// Ciclo Oficial 5 Minutos: 3 Minutos (180s) Sorteo Activo + 2 Minutos (120s) Espera/Ventas
// Single Active Orchestrator Lease en PostgreSQL + Supabase Realtime
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { OrchestratorLease } from '../types/database';

export type OrchestratorPhase =
  | 'WAITING'
  | 'PREPARING'
  | 'SALES_OPEN'
  | 'SALES_CLOSING'
  | 'SALES_CLOSED'
  | 'VALIDATING'
  | 'READY'
  | 'ACTIVE'
  | 'PAUSED'
  | 'WINNER_PENDING'
  | 'FINISHED'
  | 'SETTLEMENT'
  | 'WAITING_NEXT'
  | 'CANCELLED';

export interface OrchestratorState {
  currentDrawId: string | null;
  phase: OrchestratorPhase;
  phaseStartedAt: number;
  phaseEndsAt: number;
  remainingSeconds: number;
  totalDurationSeconds: number;
  cycleCounter: number;
  ballsDrawnCount: number;
  currentBall: number | null;
  drawCode: string | null;
  drawTitle: string | null;
  activePlayersCount: number;
  cardsSoldCount: number;
  estimatedPrize: number;
  isLeader: boolean;
  lastHeartbeat: number;
}

// Generador de ID de worker persistente para la instancia
const WORKER_INSTANCE_ID = `worker-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;

// Tiempos canónicos del ciclo oficial
export const DRAW_ACTIVE_DURATION_SECONDS = 180; // 3 minutos
export const WAITING_NEXT_DURATION_SECONDS = 120; // 2 minutos

class AutonomousDrawOrchestrator {
  private state: OrchestratorState = {
    currentDrawId: null,
    phase: 'WAITING_NEXT',
    phaseStartedAt: Date.now(),
    phaseEndsAt: Date.now() + WAITING_NEXT_DURATION_SECONDS * 1000,
    remainingSeconds: WAITING_NEXT_DURATION_SECONDS,
    totalDurationSeconds: WAITING_NEXT_DURATION_SECONDS,
    cycleCounter: 1,
    ballsDrawnCount: 0,
    currentBall: null,
    drawCode: null,
    drawTitle: null,
    activePlayersCount: 0,
    cardsSoldCount: 0,
    estimatedPrize: 0,
    isLeader: false,
    lastHeartbeat: Date.now(),
  };

  private listeners = new Set<(state: OrchestratorState) => void>();
  private tickInterval: NodeJS.Timeout | null = null;
  private ballEmissionInterval: NodeJS.Timeout | null = null;
  private isProcessingTransition = false;
  private isRunning = false;

  public subscribe(cb: (state: OrchestratorState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  public getState(): OrchestratorState {
    return { ...this.state };
  }

  private notify() {
    const current = this.getState();
    this.listeners.forEach((cb) => cb(current));
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Sincronizar inmediatamente con el lease server-side
    this.syncWithServerLease();

    // 2. Suscribirse a cambios en Realtime del lease
    if (isSupabaseConfigured) {
      supabase
        .channel('orchestrator-lease-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'draw_orchestrator_leases' },
          (payload: any) => {
            if (payload.new) {
              this.applyServerLease(payload.new as OrchestratorLease);
            }
          }
        )
        .subscribe();
    }

    // 3. Heartbeat del reloj maestro (cada 1s)
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stop() {
    this.isRunning = false;
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.ballEmissionInterval) clearInterval(this.ballEmissionInterval);
    this.tickInterval = null;
    this.ballEmissionInterval = null;
  }

  private async syncWithServerLease() {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('draw_orchestrator_leases')
        .select('*')
        .eq('id', 'MAIN_ORCHESTRATOR')
        .maybeSingle();

      if (!error && data) {
        this.applyServerLease(data as OrchestratorLease);
      }
    } catch {
      // Manejo defensivo
    }
  }

  private applyServerLease(lease: OrchestratorLease) {
    const started = new Date(lease.phase_started_at).getTime();
    const ends = new Date(lease.phase_ends_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.round((ends - now) / 1000));
    const total = Math.max(1, Math.round((ends - started) / 1000));

    this.state = {
      ...this.state,
      currentDrawId: lease.current_draw_id,
      phase: lease.current_phase as OrchestratorPhase,
      phaseStartedAt: started,
      phaseEndsAt: ends,
      remainingSeconds: remaining,
      totalDurationSeconds: total,
      cycleCounter: lease.cycle_counter || 1,
      isLeader: lease.active_worker_id === WORKER_INSTANCE_ID,
      lastHeartbeat: new Date(lease.heartbeat_at).getTime(),
    };

    if (lease.current_draw_id) {
      this.refreshDrawStats(lease.current_draw_id);
    }

    this.notify();
  }

  private async refreshDrawStats(drawId: string) {
    if (!isSupabaseConfigured) return;
    try {
      const [{ data: drawData }, { count: cardsCount }, { count: playersCount }] = await Promise.all([
        supabase.from('draws').select('drawn_numbers, public_code, title, status').eq('id', drawId).single(),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('draw_id', drawId),
        supabase.from('cards').select('user_id', { count: 'exact', head: true }).eq('draw_id', drawId),
      ]);

      if (drawData) {
        const drawn = drawData.drawn_numbers || [];
        this.state = {
          ...this.state,
          drawCode: drawData.public_code,
          drawTitle: drawData.title,
          ballsDrawnCount: drawn.length,
          currentBall: drawn.length > 0 ? drawn[drawn.length - 1] : null,
          cardsSoldCount: cardsCount || 0,
          activePlayersCount: playersCount || 0,
          estimatedPrize: (cardsCount || 0) * 5.0 * 0.75, // 75% pozo
        };
        this.notify();
      }
    } catch {
      // Silencioso
    }
  }

  private async tick() {
    const now = Date.now();
    const remaining = Math.max(0, Math.round((this.state.phaseEndsAt - now) / 1000));

    this.state.remainingSeconds = remaining;
    this.notify();

    // Si el tiempo de la fase actual expiró, ejecutar transición server-side
    if (remaining <= 0 && !this.isProcessingTransition) {
      this.advancePhase();
    }
  }

  /**
   * Avanza la fase de manera atómica respetando la autoridad del servidor.
   */
  public async advancePhase() {
    if (this.isProcessingTransition) return;
    this.isProcessingTransition = true;

    try {
      if (this.state.phase === 'WAITING_NEXT' || this.state.phase === 'WAITING' || this.state.phase === 'FINISHED') {
        // Fin de los 2 minutos de espera -> INICIAR NUEVO SORTEO DE 3 MINUTOS
        await this.serverStartNewDrawCycle();
      } else if (this.state.phase === 'ACTIVE') {
        // Fin de los 3 minutos de sorteo -> FINALIZAR SORTEO Y ENTRAR EN VENTANA DE 2 MINUTOS
        await this.serverFinishDrawCycle();
      }
    } catch (e) {
      console.error('[ORCHESTRATOR] Error en transición de fase:', e);
    } finally {
      this.isProcessingTransition = false;
    }
  }

  /**
   * Crea e inicia el próximo sorteo de 3 minutos de forma server-authoritative
   */
  private async serverStartNewDrawCycle() {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Obtener sala activa
      const { data: room } = await supabase.from('game_rooms').select('id').limit(1).single();
      if (!room) return;

      // 2. Crear sorteo en PostgreSQL
      const { data: drawResult, error: drawErr } = await supabase.rpc('create_draw_authoritative', {
        p_room_id: room.id,
        p_modality_id: 'BINGO_75',
        p_title: `Sorteo Continuo #${this.state.cycleCounter + 1} (3 Minutos)`,
      });

      let drawId = drawResult?.draw_id;

      // Si no fue operador o no pudo crear por permisos de sesión, buscar el último DRAFT/READY o consultar RPC
      if (!drawId) {
        const { data: latest } = await supabase
          .from('draws')
          .select('id, version, status')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        drawId = latest?.id;
      }

      if (!drawId) return;

      // 3. Pasar a READY y luego ACTIVE
      await supabase.from('draws').update({ status: 'READY' }).eq('id', drawId);
      try {
        await supabase.rpc('start_draw_authoritative', { p_draw_id: drawId, p_expected_version: 1 });
      } catch {
        // Ignorar si ya inició o si está en curso
      }

      // 4. Actualizar Lease Server-Side para 180s (3 minutos)
      const now = new Date();
      const endsAt = new Date(now.getTime() + DRAW_ACTIVE_DURATION_SECONDS * 1000);

      await supabase
        .from('draw_orchestrator_leases')
        .update({
          current_draw_id: drawId,
          current_phase: 'ACTIVE',
          phase_started_at: now.toISOString(),
          phase_ends_at: endsAt.toISOString(),
          cycle_counter: this.state.cycleCounter + 1,
          active_worker_id: WORKER_INSTANCE_ID,
          heartbeat_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', 'MAIN_ORCHESTRATOR');

      this.state = {
        ...this.state,
        currentDrawId: drawId,
        phase: 'ACTIVE',
        phaseStartedAt: now.getTime(),
        phaseEndsAt: endsAt.getTime(),
        remainingSeconds: DRAW_ACTIVE_DURATION_SECONDS,
        totalDurationSeconds: DRAW_ACTIVE_DURATION_SECONDS,
        cycleCounter: this.state.cycleCounter + 1,
        ballsDrawnCount: 0,
        currentBall: null,
      };

      this.notify();

      // Iniciar emisión controlada de balotas (cada ~4-5 segundos dentro de la ventana de 180s)
      this.startBallEmissionLoop(drawId);
    } catch (e) {
      console.error('[ORCHESTRATOR] Error iniciando nuevo ciclo:', e);
    }
  }

  /**
   * Finaliza el sorteo actual y activa la ventana de 120s (2 minutos) para el siguiente sorteo
   */
  private async serverFinishDrawCycle() {
    if (this.ballEmissionInterval) {
      clearInterval(this.ballEmissionInterval);
      this.ballEmissionInterval = null;
    }

    if (!isSupabaseConfigured || !this.state.currentDrawId) return;

    try {
      const now = new Date();
      const endsAt = new Date(now.getTime() + WAITING_NEXT_DURATION_SECONDS * 1000);

      // Marcar sorteo como FINISHED en PostgreSQL
      await supabase
        .from('draws')
        .update({ status: 'FINISHED', finished_at: now.toISOString() })
        .eq('id', this.state.currentDrawId);

      // Actualizar Lease Server-Side a WAITING_NEXT por 120s
      await supabase
        .from('draw_orchestrator_leases')
        .update({
          current_phase: 'WAITING_NEXT',
          phase_started_at: now.toISOString(),
          phase_ends_at: endsAt.toISOString(),
          active_worker_id: WORKER_INSTANCE_ID,
          heartbeat_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', 'MAIN_ORCHESTRATOR');

      this.state = {
        ...this.state,
        phase: 'WAITING_NEXT',
        phaseStartedAt: now.getTime(),
        phaseEndsAt: endsAt.getTime(),
        remainingSeconds: WAITING_NEXT_DURATION_SECONDS,
        totalDurationSeconds: WAITING_NEXT_DURATION_SECONDS,
      };

      this.notify();
    } catch (e) {
      console.error('[ORCHESTRATOR] Error finalizando ciclo:', e);
    }
  }

  /**
   * Emite balotas espaciadas de forma controlada dentro de los 180 segundos.
   */
  private startBallEmissionLoop(drawId: string) {
    if (this.ballEmissionInterval) clearInterval(this.ballEmissionInterval);

    // 180 segundos / ~40 balotas promedio antes de bingo = ~4.5 segundos por balota
    const BALL_INTERVAL_MS = 4500;

    this.ballEmissionInterval = setInterval(async () => {
      if (this.state.phase !== 'ACTIVE' || !this.state.currentDrawId) {
        if (this.ballEmissionInterval) clearInterval(this.ballEmissionInterval);
        return;
      }

      try {
        const { data: draw } = await supabase
          .from('draws')
          .select('version, status, drawn_numbers')
          .eq('id', drawId)
          .single();

        if (!draw || draw.status !== 'ACTIVE') {
          if (this.ballEmissionInterval) clearInterval(this.ballEmissionInterval);
          return;
        }

        // Llamar a la función PostgreSQL server-authoritative
        const { data: ballResult } = await supabase.rpc('draw_ball_authoritative', {
          p_draw_id: drawId,
          p_expected_version: draw.version,
        });

        if (ballResult && ballResult.ball_number) {
          this.state.currentBall = ballResult.ball_number;
          this.state.ballsDrawnCount = ballResult.ball_index || (draw.drawn_numbers.length + 1);
          this.notify();

          if (ballResult.is_finished) {
            this.serverFinishDrawCycle();
          }
        }
      } catch {
        // En caso de error o pause, reintentará en el siguiente tick
      }
    }, BALL_INTERVAL_MS);
  }
}

// Instancia singleton compartida
export const drawOrchestrator = new AutonomousDrawOrchestrator();
