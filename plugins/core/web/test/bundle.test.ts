import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bundle } from '../src/bundle/build'
import { page } from '../src/page/page'

const roots: string[] = []

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const extension = async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sand-web-bundle-'))
  roots.push(dir)
  await Bun.write(join(dir, 'shared.ts'), `export const shared = () => 'shared-marker'`)
  await Bun.write(join(dir, 'lazy.ts'), `import { shared } from './shared'\nexport const lazy = () => 'lazy-marker' + shared()`)
  await Bun.write(
    join(dir, 'index.ts'),
    `import { shared } from './shared'\nexport default { name: 'probe', apply() { console.log(shared()); void import('./lazy').then(module => console.log(module.lazy())) } }`,
  )
  return { id: 'probe', dir, entry: join(dir, 'index.ts'), modules: {}, builtin: true }
}

const text = (body: Uint8Array) => new TextDecoder().decode(body)

test('the page loads the entry and its shared chunks up front, and code imported on demand only when asked', async () => {
  const built = await bundle([await extension()], {})
  const html = page(built, 'pc', [])
  const upFront = [built.entry, ...built.preload]
  const holding = (marker: string) => [...built.assets].filter(([, asset]) => text(asset.body).includes(marker)).map(([path]) => path)

  expect(html).toContain(`<script type="module" blocking="render" src="${built.entry}">`)
  for (const path of built.preload) expect(html).toContain(`<link rel="modulepreload" href="${path}">`)
  expect(holding('shared-marker').every(path => upFront.includes(path))).toBe(true)
  expect(holding('lazy-marker')).toHaveLength(1)
  expect(upFront).not.toContain(holding('lazy-marker')[0])
})
