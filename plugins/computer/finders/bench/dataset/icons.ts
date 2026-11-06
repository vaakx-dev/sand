export interface Icon {
  shape: string
  path: string
}

const bell = '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20h4"/>'
const star = 'M12 3l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 10l6-1z'
const eye = '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
const lens = '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>'
const lines = (rows: [number, number][]) => `<path d="${rows.map(([from, to], index) => `M${from} ${5 + index * 4.5}h${to - from}`).join('')}"/>`

export const icons: Record<string, Icon> = {
  search: { shape: 'magnifying glass', path: lens },
  'zoom in': { shape: 'magnifying glass with a plus', path: `${lens}<path d="M8 11h6M11 8v6"/>` },
  'zoom out': { shape: 'magnifying glass with a minus', path: `${lens}<path d="M8 11h6"/>` },
  settings: { shape: 'gear', path: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>' },
  notifications: { shape: 'bell', path: bell },
  mute: { shape: 'bell with a slash', path: `${bell}<path d="M3 3l18 18"/>` },
  delete: { shape: 'trash can', path: '<path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14"/>' },
  download: { shape: 'arrow down onto a line', path: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>' },
  upload: { shape: 'arrow up from a line', path: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>' },
  import: { shape: 'arrow into a tray', path: '<path d="M12 3v11M8 10l4 4 4-4M4 14v6h16v-6"/>' },
  export: { shape: 'arrow out of a tray', path: '<path d="M12 14V3M8 7l4-4 4 4M4 14v6h16v-6"/>' },
  favourite: { shape: 'outlined star', path: `<path d="${star}"/>` },
  unfavourite: { shape: 'filled star', path: `<path d="${star}" fill="currentColor"/>` },
  add: { shape: 'plus', path: '<path d="M12 5v14M5 12h14"/>' },
  remove: { shape: 'minus', path: '<path d="M5 12h14"/>' },
  close: { shape: 'cross', path: '<path d="M6 6l12 12M18 6L6 18"/>' },
  account: { shape: 'person', path: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
  mail: { shape: 'envelope', path: '<rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/>' },
  calendar: { shape: 'calendar', path: '<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
  help: { shape: 'question mark in a circle', path: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>' },
  lock: { shape: 'closed padlock', path: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>' },
  unlock: { shape: 'open padlock', path: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8-1"/>' },
  show: { shape: 'eye', path: eye },
  hide: { shape: 'eye with a slash', path: `${eye}<path d="M3 3l18 18"/>` },
  undo: { shape: 'curved arrow to the left', path: '<path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/>' },
  redo: { shape: 'curved arrow to the right', path: '<path d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3"/>' },
  'align left': { shape: 'lines flush left', path: lines([[3, 21], [3, 15], [3, 21], [3, 13]]) },
  'align center': { shape: 'centred lines', path: lines([[3, 21], [6, 18], [3, 21], [7, 17]]) },
  'align right': { shape: 'lines flush right', path: lines([[3, 21], [9, 21], [3, 21], [11, 21]]) },
  justify: { shape: 'lines of equal length', path: lines([[3, 21], [3, 21], [3, 21], [3, 21]]) },
  'bulleted list': { shape: 'dots beside lines', path: '<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>' },
  'numbered list': { shape: 'numbers beside lines', path: '<path d="M9 6h12M9 12h12M9 18h12M4 4v4M3 14h2l-2 3h2"/>' },
  indent: { shape: 'arrow pointing right into lines', path: '<path d="M11 6h10M11 12h10M11 18h10M3 9l3 3-3 3"/>' },
  outdent: { shape: 'arrow pointing left beside lines', path: '<path d="M11 6h10M11 12h10M11 18h10M6 9l-3 3 3 3"/>' },
  edit: { shape: 'pencil', path: '<path d="M4 20l4-1 11-11-3-3L5 16z"/>' },
  copy: { shape: 'two overlapping squares', path: '<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/>' },
  more: { shape: 'three dots', path: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>' },
  previous: { shape: 'chevron pointing left', path: '<path d="M15 5l-7 7 7 7"/>' },
  next: { shape: 'chevron pointing right', path: '<path d="M9 5l7 7-7 7"/>' },
  archive: { shape: 'box with a lid', path: '<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>' },
  pin: { shape: 'pushpin', path: '<path d="M12 22v-6M8 4h8l-1 6 3 3v2H6v-2l3-3z"/>' },
  share: { shape: 'three connected dots', path: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4M8 13l8 4"/>' },
}

export const svg = (name: string, size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]!.path}</svg>`
