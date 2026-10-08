---
name: sand-plugins
description: How to write sand plugins. Load before creating or editing a plugin that extends sand.
---

A plugin is a folder whose index.ts default-exports `definePlugin(...)` from `drydock`. Put it in `~/.sand/plugins/<name>/` (every project) or `<project>/.sand/plugins/<name>/` (this project); new folders load on the next `/reload` or restart.

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
- Use the `ui` service for commands and notices so the feature works in both the web UI and headless `sand -p`.
- Ship skills by putting `skills/<name>/SKILL.md` in the plugin folder and calling `ctx.watch('skills', skills => skills?.register(dir))`.
- Services and events are typed in `{{registry}}`; read it for exact signatures.

Check your plugin with the `plugin` tool by name. Never reload plugins yourself: it can interrupt running agents. After adding a plugin, ask the user to run `/reload`; after editing a loaded one, `/reload <name>`. Nothing reloads on its own.
