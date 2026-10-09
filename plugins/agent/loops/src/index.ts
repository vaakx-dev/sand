import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createChoice } from './choice'
import { loopCommand } from './command'
import type { Loops } from './contract'
import { createDefaults } from './defaults'
import { createFaults } from './faults'
import { createFrame } from './frame/run'
import { createRegistry } from './registry'
import { serveLoops } from './serve'

export default definePlugin({
  name: 'loops',
  description: 'Runs each turn in a shared frame and hands it to the agent loop chosen for the thread',
  inject: ['cli', 'llm', 'context', 'tools'],
  uses: {
    ui: 'there is no /loop command and loop fallbacks are not announced',
    server: 'the page cannot list or choose loops',
  },
  config: z.object({ default: z.string().optional() }),
  async apply(ctx, config) {
    const registry = createRegistry()
    const defaults = await createDefaults(ctx.cli.home, config.default)
    const choice = createChoice(ctx, registry, defaults)
    const frame = createFrame(ctx, choice.resolve, createFaults(ctx, registry, choice))

    const loops: Loops = {
      register: registry.register,
      list: registry.list,
      get: registry.get,
      state: choice.state,
      choose: choice.choose,
      defaultName: defaults.get,
      async setDefault(name) {
        if (!registry.get(name)) throw new Error(`No agent loop named ${name}`)
        await defaults.set(name)
      },
      runWith: (impl, session, prompt, overrides) => frame.run(session, prompt, { impl, ...(overrides && { overrides }) }),
    }
    ctx.provide('loops', loops)
    ctx.provide('loop', {
      run: (session, prompt, signal) => frame.run(session, prompt, signal ? { signal } : {}),
      interrupt: frame.interrupt,
      active: frame.active,
    })
    serveLoops(ctx, loops, choice)
    ctx.watch('ui', ui => ui?.command(loopCommand(ctx, ui, loops, frame.active)))
  },
})
