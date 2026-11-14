import { expect, test } from 'bun:test'
import { safeCss } from '../src/css'

test('CSS that styles the page with colours, local pictures and data URLs is kept as written', () => {
  const css = `[data-part="sidebar"] { background: url(data:image/png;base64,AAAA) no-repeat; }
[data-part="composer"] { border-radius: 24px; background-image: url("/media/grain.png"); }
[data-part="agent-message"]::before { content: "→ "; }`
  expect(safeCss(css)).toBe(css)
})

test('imports and anything that would load from the internet are stripped, however they are spelled', () => {
  const css = [
    '@import url("https://evil.example/x.css");',
    "@IMPORT 'https://evil.example/y.css';",
    'body { background: url(https://evil.example/a.png); }',
    "main { background: URL('//evil.example/b.png'); }",
    'nav { background: image-set("http://evil.example/c.png" 1x); }',
    'div { background: u\\72l(https://evil.example/d.png); }',
    '@\\69mport "https://evil.example/e.css";',
    '@font-face { font-family: x; src: url(ftp://evil.example/f.woff); }',
    'p { background: image-set("\\"" "https://evil.example/g.png" 1x); }',
  ].join('\n')
  const safe = safeCss(css)
  expect(safe).not.toContain('evil.example')
  expect(safe).not.toMatch(/@import/i)
})

test('comments cannot hide a remote URL from the check', () => {
  expect(safeCss('body { background: url(/**/https://evil.example/a.png); }')).not.toContain('evil.example')
})
