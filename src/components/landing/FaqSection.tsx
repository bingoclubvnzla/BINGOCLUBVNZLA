import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: '¿Qué significa que la plataforma se encuentre en FASE 1?',
      a: 'Significa que hemos desplegado la infraestructura tecnológica completa (arquitectura de base de datos relacional con RLS en PostgreSQL, autenticación de usuarios, roles RBAC, modalidades y auditoría), pero las operaciones de dinero real, depósitos bancarios y pagos se encuentran intencionalmente desactivadas. En esta fase no se maneja saldo real ni ficticio.',
    },
    {
      q: '¿Cómo protege la plataforma la identidad y privacidad de los jugadores?',
      a: 'Al registrarse, el sistema asigna de forma automática un código alfanumérico público inmutable (por ejemplo, BCV-7K9M2W). Tu correo electrónico y teléfono personal jamás son visibles para otros jugadores ni en los registros públicos de sorteos.',
    },
    {
      q: '¿Quién decide qué números salen en los sorteos?',
      a: 'El servidor exclusivamente (arquitectura Server-Authoritative). El navegador del cliente no tiene permiso ni capacidad técnica para alterar las balotas ni simular victorias. Cada extracción es generada por el motor criptográfico del backend y auditada en base de datos.',
    },
    {
      q: '¿Qué modalidades de bingo estarán disponibles?',
      a: 'La plataforma incorpora 5 modalidades nativas: Bingo 75 balotas (5x5 con centro libre), Bingo 90 balotas (3x9 tradicional), Bingo de Animalitos (5x5 con 38 figuras venezolanas), Bingo de Objetos y Figuras (5x5) y Bingo de Chapitas (3x5 formato rápido).',
    },
    {
      q: '¿Cuándo se activarán Pago Móvil y Binance Pay?',
      a: 'Estas pasarelas formarán parte de la FASE 2, una vez concluidas las auditorías de seguridad, pruebas de carga de WebSockets y validación de las llaves de idempotencia bancaria.',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-slate-950 border-b border-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest block mb-2">
            Respuestas Claras
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Todo lo que necesitas conocer sobre la plataforma y su arquitectura.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm font-semibold text-white hover:text-amber-400 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    <p>{faq.a}</p>
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
