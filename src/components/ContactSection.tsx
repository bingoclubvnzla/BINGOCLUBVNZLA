import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Consulta General',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <section id="contacto" className="py-20 bg-[#070D18] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Info */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>ATENCIÓN Y SOPORTE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
              Canal de Contacto y Reportes
            </h2>
            <p className="mt-3 text-base text-slate-400 leading-relaxed">
              ¿Tiene preguntas sobre la Fase 1, sugerencias para futuras modalidades o desea reportar una anomalía de seguridad? Nuestro equipo técnico está a su disposición.
            </p>

            <div className="mt-8 space-y-4 text-sm text-slate-300">
              <div className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <Mail className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Soporte Técnico Oficial:</span>
                  <span className="font-semibold text-white">soporte@bingoclubvnzla.com</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Equipo de Auditoría & Seguridad:</span>
                  <span className="font-semibold text-white">seguridad@bingoclubvnzla.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl">
              {submitted ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 font-['Outfit']">
                    Mensaje Recibido
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Gracias por comunicarse con Bingo Club Vnzla. Hemos registrado su consulta bajo ticket de auditoría.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', subject: 'Consulta General', message: '' });
                    }}
                    className="mt-6 px-5 py-2 text-xs font-bold text-[#070D18] bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Carlos Silva"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="correo@ejemplo.com"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Motivo del Contacto
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                    >
                      <option value="Consulta General">Consulta General sobre Fase 1</option>
                      <option value="Sugerencia Modalidades">Propuesta de Modalidad o Función</option>
                      <option value="Reporte Seguridad">Reporte de Seguridad / Divulgación Responsable</option>
                      <option value="Alianzas Operativas">Alianzas Operativas y Franquicias</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mensaje
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Describa su inquietud o sugerencia técnica..."
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 text-xs font-bold text-[#070D18] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>ENVIAR MENSAJE SEGURO</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
