// BINGO CLUB VNZLA ONLINE — PREGUNTAS FRECUENTES (FAQ)
// FASE 1: CLARIDAD Y TRANSPARENCIA

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: '¿Por qué no hay dinero real activo en esta versión?',
    answer:
      'Esta es la Fase 1: Fundación Profesional y Seguridad. Nuestro objetivo es certificar de manera exhaustiva el motor de base de datos PostgreSQL, las políticas Row Level Security (RLS), la máquina de estados de sorteos y el sistema RBAC antes de habilitar pasarelas de pago como Pago Móvil o Binance Pay en la Fase 2.',
  },
  {
    question: '¿Qué es el identificador BCV-XXXXXX y por qué no se usa mi correo?',
    answer:
      'Por normativas de privacidad y seguridad, ningún jugador expone su correo electrónico o teléfono en las salas públicas. A cada usuario se le asigna de forma única un código criptográfico (ej. BCV-7X9P2Q) que sirve de identidad pública inmutable.',
  },
  {
    question: '¿Cuáles son las 5 modalidades de juego soportadas?',
    answer:
      'Bingo Tradicional 75 (5x5 con centro libre), Bingo 90 Español (3x5 con 15 números activos), Lotto Animalitos Vnzla (5x5 con 38 figuras zoológicas criollas y centro libre), Bingo de Objetos Criollos (5x5 con 50 elementos culturales venezolanos) y Bingo Chapitas Callejero (3x5 rápido sin centro libre).',
  },
  {
    question: '¿Cómo se garantiza que las balotas no sean manipuladas?',
    answer:
      'La plataforma opera bajo arquitectura Server Authoritative: el cliente en el navegador no tiene potestad para decidir extracciones. Cada número extraído queda sellado en la tabla draw_events con un hash criptográfico encadenado SHA256 que imposibilita la alteración retroactiva.',
  },
  {
    question: '¿Quién puede realizar tareas de operador o administración?',
    answer:
      'Solo cuentas expresamente promovidas a OPERATOR, SUPERVISOR o ADMIN en el backend. Los usuarios registrados comienzan estrictamente como PLAYER y la base de datos aborta con triggers cualquier intento de auto-escalada de privilegios.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-20 bg-slate-950 border-t border-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            Dudas Comunes
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black text-white">
            Preguntas Frecuentes
          </h2>
          <p className="mt-3 text-slate-400 text-sm">
            Respuestas directas sobre la arquitectura y el alcance de la Fase 1.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggle(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-900 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-200">
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 border-t border-slate-800/80 leading-relaxed">
                    {faq.answer}
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
