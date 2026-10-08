import { markdownCss } from '@sand/conversation'

export const css = `
${markdownCss}
.transcript-chat-streaming > * { animation: transcript-chat-reveal .6s ease-out; }
@media (prefers-reduced-motion: reduce) { .transcript-chat-streaming > * { animation: none !important; } }
@keyframes transcript-chat-reveal { from { opacity: 0; } }
`
