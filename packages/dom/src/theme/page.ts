import { TEXT } from '@vaakx-dev/vrui'
import { color, EASE, mono, sans } from './tokens'

const [fontSize, lineHeight] = TEXT.sm

export const pageCss = `
:root { color-scheme: dark; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; outline: 0; }
html, body { height: 100%; }
body { background: ${color('neutral', 900)}; color: ${color('neutral', 100)}; font: ${fontSize}/${lineHeight} ${sans}; -webkit-font-smoothing: antialiased; overflow: hidden; }
button { font: inherit; color: inherit; background: none; text-align: left; }
input, textarea, select { font: inherit; color: inherit; background: none; }
::placeholder { color: ${color('neutral', 500)}; }
svg { flex: none; display: block; }
[hidden] { display: none !important; }
::selection { background: color-mix(in srgb, ${color('accent', 500)} 40%, transparent); }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: ${color('neutral', 600)}; border-radius: 6px; }
@supports not selector(::-webkit-scrollbar) {
  * { scrollbar-width: thin; scrollbar-color: ${color('neutral', 600)} transparent; }
}
#stage { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: auto; }
.font-mono { font-family: ${mono}; }
.prose { line-height: 1.7; }
.whitespace-pre { white-space: pre; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.wrap-anywhere { overflow-wrap: anywhere; }
.tabular-nums { font-variant-numeric: tabular-nums; }
.resize-none { resize: none; }
.overscroll-contain { overscroll-behavior: contain; }
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
.rotate-90 { transform: rotate(90deg); }
.-rotate-90 { transform: rotate(-90deg); }
.animate-spin { animation: spin .8s linear infinite; }
.spinner, .spinner-turn { display: inline-flex; }
.spinner-still { display: none; }
.live-shine { -webkit-text-fill-color: transparent; background: linear-gradient(90deg, transparent, ${color('neutral', 50)}, transparent) -4.5rem 0 / 4.5rem 100% no-repeat, linear-gradient(currentColor, currentColor); -webkit-background-clip: text; background-clip: text; animation: shine 2.2s steps(30) infinite paused; }
.live-shine[data-seen] { animation-play-state: running; }
.animate-fade { animation: fade .3s ${EASE}; }
.animate-rise { animation: rise .25s ${EASE}; }
.animate-pop { animation: pop .22s ${EASE}; }
.animate-slide { animation: slide .25s ${EASE}; }
.animate-drawer { animation: drawer .25s ${EASE}; }
.animate-tip { animation: tip .12s ${EASE}; }
.group:is(:focus-visible, :has(:focus-visible)) .group-hover\\:flex { display: flex; }
.group:is(:focus-visible, :has(:focus-visible)) .group-hover\\:hidden { display: none; }
.group:is(:focus-visible, :has(:focus-visible)) .group-hover\\:opacity-100 { opacity: 1; }
@media (hover: hover) {
  .group:hover .group-hover\\:flex { display: flex; }
  .group:hover .group-hover\\:hidden { display: none; }
  .group:hover .group-hover\\:opacity-100 { opacity: 1; }
}
@media (hover: none) {
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
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shine { to { background-position: calc(100% + 4.5rem) 0, 0 0; } }
@keyframes fade { from { opacity: 0; transform: translateY(5px); } }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } }
@keyframes pop { from { opacity: 0; transform: translateY(-8px) scale(.98); } }
@keyframes slide { from { opacity: 0; transform: translateX(30px); } }
@keyframes drawer { from { transform: translateX(-100%); } }
@keyframes appear { from { opacity: 0; } }
@keyframes tip { from { opacity: 0; transform: scale(.97); } }
`
