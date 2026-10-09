// ====================================================================
// BINGO CLUB VNZLA ONLINE — SECCIÓN DE CONTACTO Y SOPORTE
// ====================================================================

import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'Soporte General', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contacto" className="py-20 border-t border-slate-800/80 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Canal Oficial
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white mt-2">
              Contacto y Atención al Jugador
            </h2>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              ¿Tienes preguntas sobre el funcionamiento de las salas, sugerencias para nuevas modalidades o deseas reportar una incidencia de seguridad? Nuestro equipo de operaciones está a tu disposición.
            </p>

            <div className="mt-8 space-y-4 text-xs text-slate-300">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400">Correo Electrónico Oficial</p>
                  <p className="font-semibold text-white">soporte@bingoclubvnzla.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-400">Atención en Tiempo Real</p>
                  <p className="font-semibold text-white">Canal de Moderación en Salas Activas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Mensaje Recibido</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Gracias por comunicarte con el equipo de Bingo Club Vnzla. Tu reporte ha sido registrado en la bitácora de soporte.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-white mb-2">Envíanos un Mensaje</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nombre o Apodo BCV</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tu nombre"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu_correo@ejemplo.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Asunto</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Soporte General">Soporte General</option>
                    <option value="Reporte de Seguridad">Reporte de Seguridad / Vulnerabilidad</option>
                    <option value="Sugerencia de Modalidad">Sugerencia de Modalidad</option>
                    <option value="Consulta sobre Fase 2">Consulta sobre Fase 2 (Finanzas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mensaje</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe tu consulta detalladamente..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Mensaje</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
