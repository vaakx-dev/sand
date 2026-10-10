import { colorVar, TEXT } from '@vaakx-dev/vrui'
import { sans } from './tokens'

const [fontSize, lineHeight] = TEXT.sm
const ease = 'cubic-bezier(.32,.72,0,1)'

export const pageCss = `
:root { color-scheme: dark; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; outline: 0; }
html, body { height: 100%; }
* { -webkit-tap-highlight-color: transparent; }
[data-menu] { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
body { background: ${colorVar('neutral', 900)}; color: ${colorVar('neutral', 100)}; font: ${fontSize}/${lineHeight} ${sans}; -webkit-font-smoothing: antialiased; overflow: hidden; }
button { font: inherit; color: inherit; background: none; text-align: left; }
input, textarea, select { font: inherit; color: inherit; background: none; }
::placeholder { color: ${colorVar('neutral', 500)}; }
svg { flex: none; display: block; }
[hidden] { display: none !important; }
::selection { background: color-mix(in srgb, ${colorVar('accent', 500)} 40%, transparent); }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: ${colorVar('neutral', 600)}; border-radius: 6px; }
@supports not selector(::-webkit-scrollbar) {
  * { scrollbar-width: thin; scrollbar-color: ${colorVar('neutral', 600)} transparent; }
}
#stage { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: auto; }
.prose { line-height: 1.7; }
.text-middle { text-box: trim-both ex alphabetic; }
.spinner, .spinner-turn { display: inline-flex; }
.spinner-still { display: none; }
.live-shine { -webkit-text-fill-color: transparent; background: linear-gradient(90deg, transparent, ${colorVar('neutral', 50)}, transparent) -4.5rem 0 / 4.5rem 100% no-repeat, linear-gradient(currentColor, currentColor); -webkit-background-clip: text; background-clip: text; animation: shine 2.2s steps(30) infinite paused; }
.live-shine[data-seen] { animation-play-state: running; }
.animate-fade { animation: fade .3s ${ease}; }
.animate-rise { animation: rise .25s ${ease}; }
.animate-pop { animation: pop .22s ${ease}; }
.animate-slide { animation: slide .25s ${ease}; }
.animate-drawer { animation: drawer .25s ${ease}; }
.animate-tip { animation: tip .12s ${ease}; }
.group:is(:focus-visible, :has(:focus-visible)) .group-hover\\:flex { display: flex; }
.group:is(:focus-visible, :has(:focus-visible)) .group-hover\\:hidden { display: none; }
.group:is(:focus-visible, :has(:focus-visible)) .group-hover\\:opacity-100 { opacity: 1; }
@media (hover: none) {
  .group:hover:not([aria-current="true"], :focus-visible, :has(:focus-visible)) .group-hover\\:flex,
  .group:hover:not(:focus-visible, :has(:focus-visible)) .group-hover\\:flex:not(.touch-current\\:flex) { display: none; }
  .group:hover:not(:focus-visible, :has(:focus-visible)) .group-hover\\:hidden { display: flex; }
  .group[aria-current="true"] .touch-current\\:flex { display: flex; }
  .group .group-hover\\:opacity-100 { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; scroll-behavior: auto !important; }
  .animate-fade, .animate-rise, .animate-pop, .animate-slide { animation: appear .2s linear !important; }
  .live-shine { animation: none !important; -webkit-text-fill-color: currentColor; background: none; }
  .spinner-turn { display: none; }
  .spinner-still { display: inline-flex; }
}
@keyframes shine { to { background-position: calc(100% + 4.5rem) 0, 0 0; } }
@keyframes fade { from { opacity: 0; transform: translateY(5px); } }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } }
@keyframes pop { from { opacity: 0; transform: translateY(-8px) scale(.98); } }
@keyframes slide { from { opacity: 0; transform: translateX(30px); } }
@keyframes drawer { from { transform: translateX(-100%); } }
@keyframes appear { from { opacity: 0; } }
@keyframes tip { from { opacity: 0; transform: scale(.97); } }
`
