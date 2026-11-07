import { efforts, isEffort, type Effort, type LLM } from '@sand/accounts/contract'
import { startLiveSand } from '@sand/harness'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { FinderSpec, StrategySpec } from '../src/contract'
import { createFinders } from '../src/make'
import { generate, type Sample } from './dataset'
import { reportHtml } from './report'
import { runAll, type Variant } from './run'
import { buckets, type Outcome } from './score'

const presets: Record<string, { finder: FinderSpec['kind']; strategy: StrategySpec; needsElements: boolean }> = {
  single: { finder: 'llm', strategy: { kind: 'single' }, needsElements: false },
  zoom: { finder: 'llm', strategy: { kind: 'zoom', scale: 2, rounds: 3, confidence: 0.8 }, needsElements: false },
  grid: { finder: 'llm', strategy: { kind: 'grid', size: 4, rounds: 3 }, needsElements: false },
  marks: { finder: 'llm', strategy: { kind: 'marks' }, needsElements: true },
  list: { finder: 'llm', strategy: { kind: 'list' }, needsElements: true },
  elements: { finder: 'element', strategy: { kind: 'list' }, needsElements: true },
}

const defaultModels = [
  'Luna=openrouter/openai/gpt-6-luna',
  'Haiku=openrouter/anthropic/claude-haiku-5.5',
  'DeepSeek=openrouter/deepseek/deepseek-v4.1-flash-1017',
  'GLM=openrouter/z-ai/glm-5.3-flash',
]

const { values } = parseArgs({
  options: {
    models: { type: 'string', default: defaultModels.join(',') },
    efforts: { type: 'string', default: 'none,low' },
    strategies: { type: 'string', default: Object.keys(presets).join(',') },
    'per-bucket': { type: 'string', default: '15' },
    screenspot: { type: 'string', default: '6' },
    cap: { type: 'string', default: '3' },
    calibrate: { type: 'string', default: '6' },
    seed: { type: 'string', default: '2' },
    concurrency: { type: 'string', default: '10' },
    out: { type: 'string', default: join(tmpdir(), 'sand-finders-bench', new Date().toISOString().replaceAll(':', '-').slice(0, 19)) },
  },
})

const listOf = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)

const effortOf = (name: string): Effort | undefined => {
  if (name === 'default') return undefined
  if (!isEffort(name)) throw new Error(`Unknown reasoning ${name}; pick default or one of ${efforts.join(', ')}`)
  return name
}

const models = listOf(values.models).map(entry => {
  const [label, id] = entry.includes('=') ? entry.split('=') : [entry.split('/').at(-1)!, entry]
  return { label: label!, id: id! }
})
const levels = listOf(values.efforts)
const strategies = listOf(values.strategies)
for (const strategy of strategies) if (!presets[strategy]) throw new Error(`Unknown strategy ${strategy}; pick from ${Object.keys(presets).join(', ')}`)
const budget = { cap: Number(values.cap), spent: 0, stopped: false }
const notes: string[] = []

const variantsOf = (llm: LLM, make: ReturnType<typeof createFinders>['make']) =>
  models.flatMap(({ label, id }) => {
    const info = llm.find?.(id)
    if (!info) throw new Error(`sand has no model ${id}`)
    if (!llm.price?.(id)) throw new Error(`sand has no price for ${id}, so the bench can't hold its budget`)
    if (!info.images) notes.push(`${label} reads no images, so it runs only the text strategy (elements).`)
    return levels.flatMap(level => {
      const effort = effortOf(level)
      if (effort && !info.efforts.includes(effort)) {
        notes.push(`${label} offers no ${level} reasoning (it offers ${info.efforts.join(', ') || 'none'}), so it skips ${level}.`)
        return []
      }
      return strategies.flatMap((strategy): Variant[] => {
        const preset = presets[strategy]!
        if (preset.finder === 'llm' && !info.images) return []
        const finder = make({ kind: preset.finder, model: id, effort }, preset.strategy)
        return [{ key: `${label} ${level} · ${strategy}`, model: label, effort: level, strategy, needsElements: preset.needsElements, finder }]
      })
    })
  })

const counts = (samples: Sample[]) => buckets.map(bucket => `${bucket} ${samples.filter(sample => sample.bucket === bucket).length}`).join(', ')

mkdirSync(join(values.out, 'pages'), { recursive: true })
console.log('building the dataset…')
const samples = await generate(Number(values['per-bucket']), Number(values.screenspot), Number(values.seed))
console.log(`${samples.length} targets: ${counts(samples)}`)

const sand = await startLiveSand(models.map(model => model.id))
try {
  const variants = variantsOf(sand.llm, createFinders({ llm: sand.llm, media: sand.media }).make)
  for (const note of notes) console.log(note)
  let done = 0
  const progress = (outcome: Outcome) => {
    done++
    if (outcome.error) console.log(`  ${outcome.variant} ${outcome.sample}: ${outcome.error}`)
    if (done % 100 === 0) console.log(`  ${done} locates, $${budget.spent.toFixed(3)} spent`)
  }
  const calibration = samples.slice(0, Number(values.calibrate))
  console.log(`${variants.length} variants; calibrating on ${calibration.length} targets, cap $${budget.cap}`)
  const outcomes = await runAll(variants, calibration, budget, Number(values.concurrency), progress)
  const perTarget = budget.spent / calibration.length
  const room = Math.max(0, Math.floor((budget.cap * 0.9 - budget.spent) / perTarget))
  const kept = samples.slice(0, calibration.length + room)
  console.log(`$${perTarget.toFixed(4)} per target; running ${kept.length} of ${samples.length} targets`)
  if (kept.length < samples.length) notes.push(`The full set would pass the $${budget.cap} cap, so the run kept the first ${kept.length} of ${samples.length} targets of a size-balanced order (${counts(kept)}).`)
  outcomes.push(...(await runAll(variants, kept.slice(calibration.length), budget, Number(values.concurrency), progress)))
  for (const sample of kept) await Bun.write(join(values.out, 'pages', `${sample.page.replaceAll('/', '_')}.png`), sample.screenshot.png)
  const title = `Finder bench: ${kept.length} targets, ${outcomes.length} locates, $${budget.spent.toFixed(2)} spent${budget.stopped ? ' (stopped at the cap)' : ''}`
  notes.push(
    `Models through sand's LLM service: ${models.map(model => `${model.label} = ${model.id}`).join(', ')}.`,
    `Targets: ${counts(kept)}. Synthetic pages are rendered in headless Chrome at 1920×1080 to 3840×2160; ScreenSpot-v2 (Apache-2.0) samples are fetched one by one from its archive with HTTP range requests.`,
    'A hit is a click point inside the target box (the visible part for clipped targets). Size buckets use the square root of the target area in screen pixels.',
    `Strategies: ${strategies.map(name => `${name} = ${JSON.stringify(presets[name]!.strategy)}${presets[name]!.finder === 'element' ? ' with the text-only element finder' : ''}`).join('; ')}.`,
    `${values.concurrency} locates ran at once, which adds some latency.`,
  )
  const dataset = kept.map(({ screenshot, elements, ...sample }) => ({ ...sample, width: screenshot.width, height: screenshot.height, elements: elements.length }))
  await Bun.write(join(values.out, 'results.json'), JSON.stringify({ title, notes, budget, models, levels, strategies, dataset, outcomes }, null, 2))
  await Bun.write(join(values.out, 'report.html'), reportHtml({ title, notes, outcomes, strategies }))
  console.log(`results: ${join(values.out, 'results.json')}\nreport: ${join(values.out, 'report.html')}`)
} finally {
  await sand.stop()
}
process.exit(0)
