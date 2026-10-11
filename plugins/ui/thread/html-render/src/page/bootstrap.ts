import { openLink, sizeChanged } from './protocol'
import { themeVariables } from './tokens'

const rootRule = `:root{color-scheme:dark;${Object.entries(themeVariables())
  .map(([name, value]) => `${name}:${value};`)
  .join('')}}`

const baseCss =
  'html{background:var(--background);color:var(--foreground);font-family:var(--font-sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}' +
  'body{margin:0}code,kbd,pre,samp{font-family:var(--font-mono)}'

const script = `(() => {
  if (window.parent === window) return
  let asked = 0
  let last = 0
  const post = message => window.parent.postMessage({ jsonrpc: '2.0', ...message }, '*')
  document.addEventListener('click', event => {
    const link = event.isTrusted && event.composedPath().find(node => node instanceof HTMLAnchorElement && node.hasAttribute('href'))
    if (!link) return
    let url
    try { url = new URL(link.getAttribute('href'), document.baseURI) } catch { return }
    if (!/^https?:$/.test(url.protocol)) return
    event.preventDefault()
    post({ id: ++asked, method: ${JSON.stringify(openLink)}, params: { url: url.href } })
  }, true)
  const report = () => {
    const root = document.documentElement
    const height = Math.ceil(root.scrollHeight > root.clientHeight ? root.scrollHeight : root.getBoundingClientRect().height)
    if (height === last) return
    last = height
    post({ method: ${JSON.stringify(sizeChanged)}, params: { height } })
  }
  const observer = new ResizeObserver(report)
  observer.observe(document.documentElement)
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) observer.observe(document.body)
    report()
  })
  addEventListener('load', report)
})()`

export const bootstrap = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  `<style>${rootRule}</style>`,
  `<style>${baseCss}</style>`,
  `<script>${script}</script>`,
].join('')
