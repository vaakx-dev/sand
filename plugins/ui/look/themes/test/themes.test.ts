import { pairPcs, startSand } from '@sand/harness'
import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tools } from '@sand/tools/contract'
import { starters, type Theme, themeAct, themeDecide, type ThemeState, themeTrialEntry, type ThemeTrialEntry } from '../src/contract'
import { createThemes } from '../src/runtime/themes'

const start = (home?: string) => startSand([{ id: 'fake', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['ui/look/themes'], ...(home && { home }) })

const synthwave = starters.find(starter => starter.key === 'synthwave-sunset')!.theme!

const blueprint = starters.find(starter => starter.key === 'blueprint')!.theme!

const agent = { device: 'page', kind: 'browser' as const, actor: { owner: 'thread' as const, id: 'thread-1' } }

test('a theme set from settings or the CLI is kept across restarts, and reset brings back sand’s look', async () => {
  const first = await start()
  const set = await first.ask(themeAct, { action: 'set', theme: { ...synthwave, css: '@import "https://evil.example/x.css"; [data-part="composer"] { border-radius: 4px; }' } })
  expect(set.theme?.name).toBe('Synthwave sunset')
  expect(set.trial).toBeUndefined()
  expect(set.theme?.css).toBe(' [data-part="composer"] { border-radius: 4px; }')
  const home = first.home
  await first.app.dispose()

  const again = await start(home)
  expect((await again.ask(themeAct, { action: 'read' })).theme?.name).toBe('Synthwave sunset')
  expect((await again.ask(themeAct, { action: 'reset' })).theme).toBeNull()
  await again.stop()
  rmSync(home, { recursive: true, force: true })
})

test('an agent’s theme is a trial that Keep makes stay and Undo takes back', async () => {
  const sand = await start()
  await sand.ask(themeAct, { action: 'set', theme: blueprint })
  const tried = await sand.askAs(agent)(themeAct, { action: 'set', theme: synthwave })
  expect(tried.theme?.name).toBe('Synthwave sunset')
  expect(tried.trial?.previous?.name).toBe('Blueprint')
  const again = await sand.askAs(agent)(themeAct, { action: 'set', theme: { ...synthwave, accent: '#ff77bb' } })
  expect(again.trial?.previous?.name).toBe('Blueprint')

  const undone = await sand.ask(themeDecide, { trial: again.trial!.id, keep: false })
  expect(undone.theme?.name).toBe('Blueprint')
  expect(undone.trial).toBeUndefined()

  const next = await sand.askAs(agent)(themeAct, { action: 'set', theme: synthwave })
  const kept = await sand.ask(themeDecide, { trial: next.trial!.id, keep: true })
  expect(kept.theme?.name).toBe('Synthwave sunset')
  expect(kept.trial).toBeUndefined()
  expect((await sand.ask(themeDecide, { trial: next.trial!.id, keep: false })).theme?.name).toBe('Synthwave sunset')
  await sand.stop()
})

test('a trial nobody keeps goes back by itself', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sand-themes-'))
  const seen: ThemeState[] = []
  const themes = await createThemes(join(dir, 'theme.json'), { changed: state => seen.push(state), kept: () => {}, trialMs: 50 })
  await themes.act('set', blueprint, false)
  await themes.act('set', synthwave, true)
  expect(themes.state().theme?.name).toBe('Synthwave sunset')
  await Bun.sleep(150)
  expect(themes.state()).toMatchObject({ theme: { name: 'Blueprint' } })
  expect(themes.state().trial).toBeUndefined()
  expect(seen.at(-1)?.theme?.name).toBe('Blueprint')
  themes.stop()
  rmSync(dir, { recursive: true, force: true })
})

test('the kept theme follows you to your other PCs, and the newest one wins', async () => {
  const home = await start()
  const box = await start()
  pairPcs(home, box)
  const custom: Theme = { name: 'Lab bench', base: '#102030', accent: '#33ccaa' }
  await home.ask(themeAct, { action: 'set', theme: custom })
  await Bun.sleep(50)
  expect((await box.ask(themeAct, { action: 'read' })).theme?.name).toBe('Lab bench')

  await box.askAs(agent)(themeAct, { action: 'set', theme: synthwave })
  await Bun.sleep(50)
  expect((await home.ask(themeAct, { action: 'read' })).theme?.name).toBe('Lab bench')

  await box.ask(themeAct, { action: 'reset' })
  await Bun.sleep(50)
  expect((await home.ask(themeAct, { action: 'read' })).theme).toBeNull()
  await home.stop()
  await box.stop()
})

test('an agent tries a theme with the theme tool, and the card with Keep and Undo comes after its reply', async () => {
  const sand = await startSand(
    [{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[{ type: 'call', name: 'theme', input: { action: 'set', theme: synthwave } }], [{ type: 'text', text: 'Here it is.' }]] }],
    { plugins: ['ui/look/themes'] },
  )
  await sand.ask(themeAct, { action: 'set', theme: blueprint })
  await sand.app.get(tools)!.choose('theme', 'always')
  const chat = sand.chat('fake/m')
  await sand.turns.run(chat, 'make it a synthwave sunset with pink accents')
  const state = await sand.ask(themeAct, { action: 'read' })
  expect(state.theme?.name).toBe('Synthwave sunset')
  expect(state.trial?.previous?.name).toBe('Blueprint')
  const types = chat.path().map(entry => entry.type)
  expect(types.indexOf(themeTrialEntry)).toBeGreaterThan(types.lastIndexOf('assistant'))
  const card = chat.path().find(entry => entry.type === themeTrialEntry)?.data as ThemeTrialEntry
  expect(card).toMatchObject({ trial: state.trial!.id, theme: { name: 'Synthwave sunset' }, previous: { name: 'Blueprint' } })
  const result = sand.requests('fake')[1]!
  expect(result).toContain('goes back to Blueprint')
  await sand.stop()
})
