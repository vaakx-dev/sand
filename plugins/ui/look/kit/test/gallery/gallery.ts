import { type BunPlugin } from 'bun'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Browser } from 'playwright'

const widths = [360, 1280]

const shots = mkdtempSync(join(tmpdir(), 'sand-kit-gallery-'))

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>kit gallery</title></head>
<body><script type="module" src="/page.js"></script></body>
</html>`

const sources: Record<string, string> = {
  drydock: Bun.resolveSync('drydock/browser', import.meta.dir),
  '@vaakx-dev/vrui': Bun.resolveSync('@vaakx-dev/vrui', import.meta.dir),
}

const fromSource: BunPlugin = {
  name: 'from-source',
  setup: build => {
    build.onResolve({ filter: /^(drydock|@vaakx-dev\/vrui)$/ }, ({ path }) => ({ path: sources[path]! }))
  },
}

const bundle = async () => {
  const built = await Bun.build({ entrypoints: [join(import.meta.dir, 'page.ts')], target: 'browser', plugins: [fromSource] })
  if (!built.success) throw new AggregateError(built.logs, 'the gallery page does not build')
  return built.outputs[0]!.text()
}

let server: ReturnType<typeof Bun.serve>
let browser: Browser

beforeAll(async () => {
  const script = await bundle()
  server = Bun.serve({
    port: 0,
    fetch: request =>
      new URL(request.url).pathname === '/page.js'
        ? new Response(script, { headers: { 'content-type': 'text/javascript' } })
        : new Response(html, { headers: { 'content-type': 'text/html' } }),
  })
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  server?.stop(true)
  console.log(`gallery screenshots: ${shots}`)
})

describe.each(widths)('at %ipx wide', width => {
  test('every component renders without errors', async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text())
    })
    await page.goto(server.url.href)
    await page.getByRole('heading', { name: 'Kit' }).waitFor()
    const sections = await page.locator('section[aria-label]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('aria-label'), node.getBoundingClientRect().height] as const))
    expect(sections.filter(([, height]) => height === 0)).toEqual([])
    await page.screenshot({ path: join(shots, `gallery-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: /Waiting/ }).click()
    await page.getByRole('menu').waitFor()
    await page.waitForTimeout(300)
    const menu = page.getByRole('menu')
    expect(await menu.evaluate(node => node.scrollWidth - node.clientWidth)).toBe(0)
    expect(await menu.evaluate(node => node.getBoundingClientRect().right <= innerWidth)).toBe(true)
    const edgesOf = (text: string) => menu.getByText(text, { exact: true }).evaluate(node => {
        const { left, right } = node.getBoundingClientRect()
        return { left, right }
      })
    const project = await edgesOf('harbor-tide-tables')
    const branch = await edgesOf('sand/ignore-landed-work-clashes-when-the-branch-was-merged')
    expect(branch.left - project.right).toBeLessThan(16)
    await page.screenshot({ path: join(shots, `chip-${width}.png`) })
    expect(errors).toEqual([])
    await page.close()
  }, 30_000)
})
