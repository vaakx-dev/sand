const moves = [
  '.face-open { animation: face-open 3.8s step-end infinite; animation-delay: calc(var(--phase) * -1s); }',
  '.face-shut { opacity: 0; animation: face-shut 3.8s step-end infinite; animation-delay: calc(var(--phase) * -1s); }',
  '.face-look { transform: translateX(-2.8px); animation: face-look 2.86s step-end infinite; }',
  '.face-spin { transform-box: fill-box; transform-origin: center; animation: face-spin 9s linear infinite; }',
  '.face-flip { animation: face-flip 0.4s step-end infinite; }',
  '.face-flop { animation: face-flop 0.4s step-end infinite; }',
  '.face-dot { animation: face-dot 0.75s step-end infinite; }',
  '.face-pulse { animation: face-pulse 0.63s ease-in-out infinite alternate; }',
  '.face-jitter { animation: face-jitter 0.625s step-end infinite; }',
  '.face-hop { animation: face-hop 0.98s ease-in-out infinite; }',
  '.face-sway { animation: face-sway 2.24s ease-in-out infinite alternate; }',
  '.face-twinkle { transform-box: fill-box; transform-origin: center; animation: face-twinkle 0.78s ease-in-out infinite alternate; }',
  '.face-drift { animation: face-drift 1.67s linear infinite; }',
]

const frames = [
  '@keyframes face-open { 0% { opacity: 0; } 2% { opacity: 1; } }',
  '@keyframes face-shut { 0% { opacity: 1; } 2% { opacity: 0; } }',
  '@keyframes face-look { 0% { transform: none; } 4% { transform: translateX(1.4px); } 13.5% { transform: translateX(2.8px); } 36.5% { transform: translateX(1.4px); } 46% { transform: none; } 54% { transform: translateX(-1.4px); } 63.5% { transform: translateX(-2.8px); } 86.5% { transform: translateX(-1.4px); } 96% { transform: none; } }',
  '@keyframes face-spin { to { transform: rotate(360deg); } }',
  '@keyframes face-flip { 0% { opacity: 1; } 50% { opacity: 0; } }',
  '@keyframes face-flop { 0% { opacity: 0; } 50% { opacity: 1; } }',
  '@keyframes face-dot { 0% { opacity: 1; } 33.33% { opacity: 0.3; } }',
  '@keyframes face-pulse { from { opacity: 0.4; } to { opacity: 1; } }',
  '@keyframes face-jitter { 0% { transform: translateX(calc(var(--side) * 1px)); } 20% { transform: none; } }',
  '@keyframes face-hop { 0%, 100% { transform: none; } 50% { transform: translateY(-1.6px); } }',
  '@keyframes face-sway { from { transform: translateY(-0.8px); } to { transform: translateY(0.8px); } }',
  '@keyframes face-twinkle { from { transform: scale(0.84); } to { transform: scale(1.16); } }',
  '@keyframes face-drift { from { transform: none; opacity: 1; } to { transform: translate(4px, -5px); opacity: 0.2; } }',
]

const still =
  '@media (prefers-reduced-motion: reduce) { .face-open, .face-shut, .face-look, .face-spin, .face-flip, .face-flop, .face-dot, .face-pulse, .face-jitter, .face-hop, .face-sway, .face-twinkle, .face-drift { animation: none; } }'

export const css = [...moves, ...frames, still].join('\n')
