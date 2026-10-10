---
name: sand-plugins
description: How to write sand plugins. Load before creating or editing a plugin that extends sand.
---

A plugin is a folder whose index.ts default-exports `definePlugin(...)` from `drydock`. Put it in `~/.sand/plugins/<name>/`; new folders load on the next `/reload` or restart.

```ts
import { definePlugin } from 'drydock'
import { z } from 'zod'

export default definePlugin({
  name: 'word-count',
  inject: ['tools'],
  config: z.object({ max: z.number().default(10) }),
  apply(ctx, config) {
    ctx.effect(() =>
      ctx.tools.register({
        name: 'word_count',
        description: 'Count the words in a text',
        input: z.object({ text: z.string() }),
        run: ({ text }) => String(text.split(/\s+/).filter(Boolean).length),
      }),
    )
  },
})
```

- Import only `drydock`, `zod`, `@sand/protocol` (types) and `node:`/`bun:` built-ins.
- `inject` lists required services; the plugin starts once they exist and restarts when they change. Follow optional ones with `ctx.watch(key, service => cleanup)`.
- `config` is validated against the plugin's `[plugins.<name>]` table in sand.toml.
- Register everything through `ctx` (`ctx.effect`, `ctx.on`, `ctx.provide`, `ctx.watch`, `ctx.plugin`) so unloading cleans it up.
- A throw in `apply` or a hook fails only this plugin.
- `ctx.hot.data` survives reloads; `ctx.busy()` returns a release function that reloads wait for.
- `ctx.report(error)` logs an error against this plugin without failing it; `ctx.settled()` waits until every plugin has started.
- Use the `ui` service for commands and notices. The web UI is the only user surface; `sand -p` is a minimal test runner, so don't build or adapt anything for it.
- Ship skills by putting `skills/<name>/SKILL.md` in the plugin folder and calling `ctx.watch('skills', skills => skills?.register(dir))`.
- Services and events are typed in `{{registry}}`; read it for exact signatures.

## Agent loops

A loop plugin decides how a turn runs. Inject `loops` and call `ctx.effect(() => ctx.loops.register({ name, label, description, plugin, run }))`; types come from `@sand/loops/contract`. `run(turn)` gets `turn.hooks` (`send`, `build`, `stream`, `respond`, `tools`, `inbox`, `stop`, `append`) and returns `{ stopReason, text }`. Use the hooks instead of calling the model or tools yourself, so every loop fires the same events. List the loop names in `package.json` under `"sand": { "loops": ["<name>"] }`. Users pick a loop with `/loop`; a loop that fails twice in a thread is switched off and the thread goes back to the previous one.

## Hooks

For small changes to a turn, write a hook file instead of a plugin: a `.ts` file in `~/.sand/hooks/` (or `.sand/hooks/` in a project, which the user must trust) that default-exports `(hook) => { hook('tool.before', (call, session) => …) }`. Hook moments: `turn.prompt`, `turn.start`, `model.choose`, `context.build`, `llm.response`, `tool.before`, `tool.result`, `turn.stop`, `context.overflow`, `turn.end`. `tool.before` may return `{ action: 'allow' | 'deny' | 'ask' | 'rewrite', … }`. `/hooks` lists the files and their status.

Check your plugin with the `plugin` tool by name. Never reload plugins yourself: it can interrupt running agents. After adding or editing a plugin, ask the user to run `/reload`. It starts a fresh sand runtime with every plugin; the page stays connected and running turns finish on the old runtime. Nothing reloads on its own.
