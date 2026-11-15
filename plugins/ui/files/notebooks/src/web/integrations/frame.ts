import { el, listen, resizeObserver, sig } from '@vaakx-dev/vrui'

const POLICY = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"

const pageStyle = (frame: HTMLElement) => {
  const style = getComputedStyle(frame)
  return [
    `:root{color-scheme:${style.colorScheme}}`,
    `html{overflow-y:hidden;color:${style.color};font:${style.fontSize}/1.5 ${style.fontFamily}}`,
    'body{margin:0;overflow-x:auto;overflow-wrap:anywhere}',
    'table{border-collapse:collapse;font-variant-numeric:tabular-nums}',
    'th,td{padding:4px 8px;text-align:right;border:1px solid color-mix(in srgb,currentColor 18%,transparent)}',
    'tbody tr:nth-child(odd){background:color-mix(in srgb,currentColor 5%,transparent)}',
    'img{max-width:100%;height:auto}',
    'a{color:inherit}',
  ].join('')
}

const page = (html: string, frame: HTMLElement) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${POLICY}"><base target="_blank"><style>${pageStyle(frame)}</style></head><body>${html}</body></html>`

const htmlFrame = (html: string, title: string) => {
  const source = sig('')
  const heightPx = sig(0)
  const measure = (frame: HTMLIFrameElement) => {
    const body = frame.contentDocument?.body
    if (body) heightPx.set(Math.ceil(body.getBoundingClientRect().height))
  }
  return el('iframe', {
    title,
    ref: frame => {
      frame.sandbox.value = 'allow-same-origin'
    },
    srcdoc: source,
    class: 'block w-full text-xs text-neutral-100',
    style: () => ({ height: `${heightPx.get()}px` }),
    onMount: frame => {
      resizeObserver(frame, () => measure(frame))
      source.set(page(html, frame))
      return listen(frame, 'load', () => measure(frame))
    },
  })
}

export { htmlFrame }
