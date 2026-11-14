import { processes as snapshot } from '@sand/machine'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { processes, type Processes } from './contract'
import { createMeter } from './meter'
import { createRegistry } from './registry'
import { chatMemory, performanceOf } from './report'
import { startSampler } from './sampler'

export default definePlugin({
  name: 'processes',
  description:
    "Reads this PC's memory and CPU every couple of seconds, tracks the process trees each chat starts, like its commands, what they leave running and its Claude Code or Codex app, and measures what each chat uses",
  config: z.object({ every_ms: z.number().int().positive().default(2_000) }),
  apply(ctx, config) {
    const registry = createRegistry()
    const meter = createMeter()
    const sampler = startSampler(ctx, config.every_ms)

    const service: Processes = {
      track: registry.track,
      chats: async () => chatMemory(registry, (await meter.measure()).all),
      trees: async () => (registry.empty() ? [] : registry.trees(await snapshot())),
      performance: range => performanceOf({ registry, meter, sampler }, range),
    }
    ctx.provide(processes, service)
    ctx.effect(() => registry.close)
  },
})
