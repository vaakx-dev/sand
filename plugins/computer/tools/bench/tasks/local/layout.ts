const css = `body { font: 16px/1.5 system-ui, sans-serif; margin: 0; color: #1d2330; background: #f6f7f9; }
header { background: #23395d; color: #fff; padding: 12px 24px; display: flex; gap: 24px; align-items: center; }
header a { color: #fff; } main { max-width: 960px; margin: 0 auto; padding: 24px; }
a { color: #2155c4; } table { border-collapse: collapse; width: 100%; background: #fff; } td, th { border: 1px solid #d5d9e0; padding: 6px 10px; text-align: left; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; } .card { background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; padding: 12px; }
button, input, select, textarea { font: inherit; } label { display: block; margin: 12px 0 4px; } input[type=text], input[type=email], select, textarea { width: 100%; max-width: 420px; padding: 6px; box-sizing: border-box; }`

export const layout = (title: string, body: string, script = '') =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}${script && `<script>${script}</script>`}</body></html>`

export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!

export const digits = (count: number) => Array.from({ length: count }, (_, index) => Math.floor(Math.random() * (index ? 10 : 9)) + (index ? 0 : 1)).join('')

export const shuffled = <T>(items: readonly T[]) =>
  items
    .map(item => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item)
