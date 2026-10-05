import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('INFORMACION');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <section id="contacto" className="py-20 bg-slate-900/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest block mb-2">
            Canales Oficiales
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Contacto y Soporte
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Comunícate con nuestro equipo técnico o envía sugerencias para las próximas fases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Direct channels */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                <Mail className="w-4 h-4" />
                <span>Correo de Soporte</span>
              </div>
              <p className="text-slate-300 font-mono text-[11px]">soporte@bingoclubvnzla.com</p>
              <p className="text-slate-500 mt-1 text-[11px]">Atención técnica y operativa.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>Auditoría & Seguridad</span>
              </div>
              <p className="text-slate-300 font-mono text-[11px]">seguridad@bingoclubvnzla.com</p>
              <p className="text-slate-500 mt-1 text-[11px]">Reporte responsable de vulnerabilidades.</p>
            </div>
          </div>

          {/* Contact form */}
          <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6">
            {submitted ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Mensaje Recibido</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hemos registrado su consulta en el sistema de tickets. Le responderemos al correo proporcionado a la brevedad.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Correo Electrónico de Contacto
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@dominio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Motivo de la Consulta
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="INFORMACION">Información General / Fase 1</option>
                    <option value="SEGURIDAD">Reporte de Seguridad / Vulnerabilidad</option>
                    <option value="OPERADOR">Postulación como Operador de Sala</option>
                    <option value="OTRO">Otro tema</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Detalle del Mensaje
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Escriba su consulta o sugerencia..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Consulta</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
