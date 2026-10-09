import type { Tool } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { run } from './run'
import { spec } from './spec'

export default definePlugin({
  name: 'tools',
  apply(ctx) {
    const tools = new Map<string, Tool<any>>()
    ctx.provide('tools', {
      register(tool) {
        tools.set(tool.name, tool)
        return () => {
          if (tools.get(tool.name) === tool) tools.delete(tool.name)
        }
      },
      list: () => [...tools.values()],
      specs: () => [...tools.values()].sort((a, b) => a.name.localeCompare(b.name)).map(spec),
      run: (call, context) => run(tools.get(call.name), call, context),
    })
  },
})
