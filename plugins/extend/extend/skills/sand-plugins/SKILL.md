---
name: sand-plugins
description: Write or edit a sand plugin.
---

A plugin is a folder in `~/.sand/plugins/<name>/` with a `package.json` that says where it runs, and an entry file for each place that default-exports `definePlugin(...)` from `drydock`. New folders load when the user presses Reload plugins or restarts sand.

```json
{ "name": "word-count", "type": "module", "sand": { "runtime": "./index.ts" } }
```

Places: `runtime` (the sand behind the page), `print` (`sand -p`) and `web` (an extension in the page). Your plugins never run in the host or in safe mode.

```ts
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'

export default definePlugin({
  name: 'word-count',
  inject: { tools },
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

- Services, events and wire requests are tokens. Each built-in plugin exports its tokens and types from `@sand/<name>/contract`; read `{{plugins}}/<area>/<name>/src/contract.ts` (or `contract/index.ts`) for exact signatures.
- Import only `drydock`, `zod`, `@sand/<name>/contract` modules and `node:`/`bun:` built-ins.
- `inject` maps names to required service tokens; the plugin starts once they exist and restarts when they change. Read optional ones with `ctx.get(token)` or follow them with `ctx.watch(token, service => cleanup)`.
- Events: `ctx.on(token, handler)`, `ctx.emit(token, ...args)`. The page talks to the server with `ctx.wire.call(request, input)` and `ctx.wire.on(event, handler)`; the runtime answers with `ctx.server.handle(request, handler)` and sends events with `ctx.server.broadcast(event, payload)`. Make new ones with `request`, `type` and `wireEvent` from `@sand/host-hub/contract`.
- `config` is validated against the plugin's `[plugins.<name>]` table in sand.toml.
- Register everything through `ctx` (`ctx.effect`, `ctx.on`, `ctx.provide`, `ctx.watch`, `ctx.plugin`) so unloading cleans it up.
- A throw in `apply` or a hook fails only this plugin.
- `ctx.hot.data` survives reloads; `ctx.busy()` returns a release function that reloads wait for.
- `ctx.report(error)` logs an error against this plugin without failing it; `ctx.settled()` waits until every plugin has started.
- The web UI is the only user surface; `sand -p` is a minimal test runner, so don't build or adapt anything for it.
- Ship skills by putting `skills/<name>/SKILL.md` in the plugin folder and calling `ctx.watch(skills, found => found?.register(dir))` with `skills` from `@sand/skills/contract`.

Check your plugin with the `plugin` tool by name. Never reload plugins yourself: it can interrupt running agents. After adding or editing a plugin, ask the user to press the Reload plugins button at the bottom of the sidebar. It starts a fresh sand runtime with every plugin; the page stays connected and running turns finish on the old runtime. Nothing reloads on its own.
