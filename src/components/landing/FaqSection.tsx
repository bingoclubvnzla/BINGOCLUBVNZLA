// ====================================================================
// BINGO CLUB VNZLA ONLINE — PREGUNTAS FRECUENTES (FAQ)
// ====================================================================

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: '¿Qué abarca la FASE 1 de Bingo Club Vnzla Online?',
    a: 'La Fase 1 establece la fundación profesional de la plataforma: sistema de autenticación Supabase Auth, asignación de ID público seguro (BCV-XXXXXX), arquitectura de 18 tablas en PostgreSQL con Row Level Security (RLS), control de acceso por roles (RBAC) y definición de las 5 modalidades de juego oficiales.',
  },
  {
    q: '¿Por qué no hay dinero real ni recargas activas en esta versión?',
    a: 'Siguiendo las mejores prácticas de ingeniería de software y seguridad financiera, en la Fase 1 NO se activa dinero real. Primero se prueba y audita rigurosamente el motor de estados, la integridad del servidor y la resistencia contra fraudes. La infraestructura de billeteras (wallets) y solicitudes de pago ya está diseñada a nivel de base de datos y será activada en la Fase 2.',
  },
  {
    q: '¿Qué es el identificador público BCV-XXXXXX y para qué sirve?',
    a: 'Es un identificador único generado de forma segura para cada jugador registrado (ej. BCV-7K2P9Q). Permite participar en salas y mostrar ganadores sin exponer tu correo electrónico ni tu nombre completo al resto de los participantes.',
  },
  {
    q: '¿Cómo garantiza la plataforma que los sorteos no son manipulados?',
    a: 'La arquitectura es "Server Authoritative" (Servidor Autoritativo): el navegador web del usuario jamás decide qué bola sale ni si un cartón es ganador. Las extracciones son generadas y selladas en el servidor, registradas en la tabla inmutable draw_events y transmitidas en tiempo real.',
  },
  {
    q: '¿Qué roles existen en la plataforma?',
    a: 'El sistema implementa 5 niveles jerárquicos: PLAYER (jugador regular), OPERATOR (gestión y supervisión de salas en vivo), SUPERVISOR (auditoría operativa), ADMIN (gestión de configuraciones, usuarios y modalidades) y SUPER_ADMIN (control total de seguridad). Las políticas de RLS garantizan que un jugador jamás pueda ejecutar acciones reservadas para operadores o administradores.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Transparencia y Claridad
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-2">
          Preguntas Frecuentes
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Todo lo que necesitas conocer sobre la plataforma y la etapa actual de despliegue.
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="rounded-xl bg-slate-900/60 border border-slate-800 transition overflow-hidden"
            >
              <button
                onClick={() => toggle(index)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-900/90 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isOpen ? 'rotate-180 text-amber-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/40 bg-slate-950/40">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
