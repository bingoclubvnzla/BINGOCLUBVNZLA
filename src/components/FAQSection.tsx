// ============================================================================
// BINGO CLUB VNZLA ONLINE — PREGUNTAS FRECUENTES (FAQ)
// ============================================================================

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: '¿Por qué no hay dinero real activo en esta Fase 1?',
      a: 'Siguiendo las mejores prácticas de ingeniería de software y seguridad bancaria, la Fase 1 establece la infraestructura fundacional: autenticación Supabase, modelos RBAC en PostgreSQL, políticas RLS, esquemas de tablas y máquinas de estados de sorteos. Las pasarelas de Pago Móvil y Binance Pay se activarán de forma segura en la Fase 2 una vez auditado el motor base.',
    },
    {
      q: '¿Qué es el identificador BCV-XXXXXX y por qué no se usa mi correo?',
      a: 'Es tu seudónimo público asignado por el sistema (ejemplo: BCV-4H9T1Z). Garantiza que en las salas de juego ningún participante pueda conocer tu correo electrónico, número de teléfono o datos privados, preservando tu derecho a la privacidad.',
    },
    {
      q: '¿Cómo garantiza el sistema que las balotas no son manipuladas?',
      a: 'Operamos bajo el principio Server-Authoritative. El navegador no decide qué balota sale ni valida por sí mismo quién gana. Las balotas son extraídas por el servidor mediante funciones criptográficas y registradas secuencialmente en draw_events. Al cantar bingo, una Edge Function verifica la coincidencia en la base de datos.',
    },
    {
      q: '¿Qué modalidades de bingo están soportadas?',
      a: 'Soportamos 5 modalidades oficiales: Bingo 75 Clásico (5x5 con centro libre), Bingo 90 Tradicional (3x5), Bingo de Animalitos Criollo (38 animales tradicionales venezolanos con centro libre), Bingo de Objetos (5x5) y Bingo de Chapitas (3x5 rápido).',
    },
    {
      q: '¿Qué medidas de seguridad antifraude implementa la plataforma?',
      a: 'Row Level Security (RLS) en todas las tablas, triggers nativos que impiden a un usuario alterar su propio rol, firmas de sesión JWT, claves de idempotencia para prevenir dobles transacciones y un libro inmutable de auditoría (audit_logs).',
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-24 border-b border-slate-800/60 bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
            Resolución de Dudas
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl" style={{ textWrap: 'balance' }}>
            Preguntas Frecuentes
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Detalles técnicos y operativos sobre la Fase 1 de Bingo Club Vnzla Online.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-white hover:text-amber-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
