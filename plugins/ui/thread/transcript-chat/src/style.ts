import { colorVar } from '@sand/dom'

export const css = `
::highlight(transcript-chat-quote) { background-color: ${colorVar('accent', 500)}; color: ${colorVar('neutral', 950)}; }
.transcript-chat-streaming > * { animation: transcript-chat-reveal .6s ease-out; }
@media (prefers-reduced-motion: reduce) { .transcript-chat-streaming > * { animation: none !important; } }
@keyframes transcript-chat-reveal { from { opacity: 0; } }
.transcript-chat-bubble { padding-block: .75rem; }
.transcript-chat-rail { display: flow-root; }
.transcript-chat-rail .transcript-chat-copy { display: none; }
@supports (text-box: trim-both ex alphabetic) {
  .transcript-chat-bubble { text-box: trim-both ex alphabetic; padding-block: calc(.75rem + (1lh - 1ex) / 2); }
}
`
