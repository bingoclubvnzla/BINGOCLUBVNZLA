// ==============================================================================
// BINGO CLUB VNZLA ONLINE — FONDO DECORATIVO CON BOLAS 3D FLOTANTES Y NEÓN
// Inspirado en las referencias visuales oficiales de bingo en tiempo real
// ==============================================================================

import React from 'react';

interface FloatingBall {
  id: string;
  letter: string;
  number: number;
  colorClass: string;
  size: string; // Tailwind class
  position: string; // Tailwind positioning
  animationClass: string;
  opacity: string;
  blur?: string;
}

const DECORATIVE_BALLS: FloatingBall[] = [
  {
    id: 'b-7',
    letter: 'B',
    number: 7,
    colorClass: 'ball-3d-b',
    size: 'h-16 w-16 sm:h-20 sm:w-20',
    position: 'top-12 -left-4 sm:left-6',
    animationClass: 'animate-float-1',
    opacity: 'opacity-40 sm:opacity-75',
  },
  {
    id: 'i-22',
    letter: 'I',
    number: 22,
    colorClass: 'ball-3d-i',
    size: 'h-20 w-20 sm:h-28 sm:w-28',
    position: 'top-1/4 -right-6 sm:right-10',
    animationClass: 'animate-float-2',
    opacity: 'opacity-40 sm:opacity-70',
  },
  {
    id: 'n-45',
    letter: 'N',
    number: 45,
    colorClass: 'ball-sphere-gold',
    size: 'h-14 w-14 sm:h-24 sm:w-24',
    position: 'bottom-1/3 -left-6 sm:left-12',
    animationClass: 'animate-float-3',
    opacity: 'opacity-35 sm:opacity-65',
  },
  {
    id: 'g-58',
    letter: 'G',
    number: 58,
    colorClass: 'ball-3d-g',
    size: 'h-16 w-16 sm:h-20 sm:w-20',
    position: 'bottom-20 right-4 sm:right-16',
    animationClass: 'animate-float-1',
    opacity: 'opacity-35 sm:opacity-65',
  },
  {
    id: 'o-73',
    letter: 'O',
    number: 73,
    colorClass: 'ball-3d-o',
    size: 'h-12 w-12 sm:h-16 sm:w-16',
    position: 'top-2/3 right-1/4',
    animationClass: 'animate-float-2',
    opacity: 'opacity-25 sm:opacity-45',
    blur: 'blur-[0.5px]',
  },
  {
    id: 'gold-vip',
    letter: '⭐',
    number: 77,
    colorClass: 'ball-sphere-gold',
    size: 'h-10 w-10 sm:h-14 sm:w-14',
    position: 'top-16 left-1/3',
    animationClass: 'animate-float-3',
    opacity: 'opacity-25 sm:opacity-50',
  },
];

export const FloatingBallsBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {/* Luces y auroras de fondo */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-indigo-600/15 rounded-full blur-[140px]" />
      <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px]" />
      <div className="absolute bottom-10 -right-40 w-[600px] h-[600px] bg-purple-600/12 rounded-full blur-[150px]" />
      <div className="absolute top-2/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[130px]" />

      {/* Partículas de destellos sutiles */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />

      {/* Bolas de Bingo 3D Flotantes */}
      {DECORATIVE_BALLS.map((ball) => (
        <div
          key={ball.id}
          className={`absolute ${ball.position} ${ball.size} ${ball.animationClass} ${ball.opacity} ${
            ball.blur || ''
          } transition-transform duration-1000 hidden xs:flex items-center justify-center`}
        >
          <div
            className={`w-full h-full rounded-full ${ball.colorClass} relative flex flex-col items-center justify-center shadow-2xl border border-white/20`}
          >
            {/* Decal circular blanco con el número, como las bolas de lotería reales */}
            <div className="h-2/3 w-2/3 rounded-full bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center border border-white/30 shadow-inner">
              <span className="text-[9px] sm:text-[11px] font-black text-amber-300 leading-none font-mono">
                {ball.letter}
              </span>
              <span className="text-xs sm:text-base font-black text-white leading-none font-display">
                {ball.number}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
