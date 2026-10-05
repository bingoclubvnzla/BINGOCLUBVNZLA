import { describe, it, expect } from 'vitest';
import { canSubscribeToChannel } from '../lib/realtime';

describe('Realtime Channels - Autorización y Privacidad', () => {
  it('debe permitir a cualquier usuario suscribirse a canales públicos de sala y sorteos', () => {
    expect(canSubscribeToChannel('room:caracas_principal', null).allowed).toBe(true);
    expect(canSubscribeToChannel('draw:draw_99812', null).allowed).toBe(true);
  });

  it('debe permitir a un jugador suscribirse a su propio canal privado', () => {
    const user = { id: 'usr_abc_123', role: 'PLAYER' as const };
    const result = canSubscribeToChannel('player:usr_abc_123', user);
    expect(result.allowed).toBe(true);
  });

  it('debe RECHAZAR que un jugador se suscriba al canal privado de otro jugador (Prueba Negativa de Privacidad)', () => {
    const playerA = { id: 'usr_player_A', role: 'PLAYER' as const };
    const result = canSubscribeToChannel('player:usr_player_B', playerA);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ACCESO_DENEGADO_CANAL_PRIVADO_AJENO');
  });

  it('debe RECHAZAR que un jugador se suscriba al canal de operadores (Prueba Negativa de Roles)', () => {
    const player = { id: 'usr_player_1', role: 'PLAYER' as const };
    const result = canSubscribeToChannel('operator:sala_norte', player);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ROL_INSUFICIENTE_PARA_CANAL_OPERADOR');
  });

  it('debe permitir a un OPERATOR o ADMIN suscribirse al canal de operadores', () => {
    const operator = { id: 'usr_op_1', role: 'OPERATOR' as const };
    const admin = { id: 'usr_adm_1', role: 'ADMIN' as const };

    expect(canSubscribeToChannel('operator:sala_norte', operator).allowed).toBe(true);
    expect(canSubscribeToChannel('operator:sala_norte', admin).allowed).toBe(true);
  });
});
