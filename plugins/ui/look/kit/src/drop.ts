const edges = { top: '0 2px', bottom: '0 -2px', left: '2px 0', right: '-2px 0' }

export const dropCss = Object.entries(edges)
  .map(([edge, offset]) => `[data-drop="${edge}"]{box-shadow:inset ${offset} 0 var(--vrui-color-accent-400) !important}`)
  .join('\n')
