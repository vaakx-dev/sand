- TypeScript on Bun; prefer Bun APIs over Node ones.
- Don't write doc files (READMEs, design docs, notes) unless asked.
- Everything is a plugin. drydock stays agent-agnostic.
- A plugin's `package.json` `sand` field names an entry file for each place it runs: `host` (`sand serve`), `runtime` (the process behind the page), `print` (`sand -p`), `cli` (the other commands) and `web` (the page). The config plugin loads what the current place lists; the app picks no plugins. User plugins in `<home>/plugins` load only in the runtime.
- Each plugin owns its wire contract in `src/contract.ts`, built with `request` and `wireEvent` from `@sand/host-hub/contract`.
- Other packages import a plugin only through its contract, so a plugin's `exports` list its contract and nothing else (config also exports `.`, the entry the app loads). Helpers other plugins need go in its contract, or in a library under `packages/` when they're generic. `bun run check` enforces this and fails on imports across packages by path, unused `@sand/*` dependencies and import cycles between packages.
- Register everything through `ctx` so unloading cleans it up.
- The web UI is the only user surface; there is no TUI. Build features as plugins on shared services (`ui`, the wire protocol, web roles) rather than inside one UI.
- Every visible part of the web UI is a browser extension. Depend on roles, never on another plugin's name: `inject` for hard dependencies, `ctx.watch` with a fallback for soft ones.
- `ref/` holds reference repos. Don't search or edit it unless asked; scope searches to `apps`, `packages` and `plugins`.
- vrui (`@vaakx-dev/vrui`) and drydock come from GitHub (`vaakx-dev/vrui`, `vaakx-dev/drydock`), pinned to release tags and used from source. Read their `AGENTS.md` and `docs/` in `node_modules/@vaakx-dev/vrui` and `plugins/host/hub/node_modules/drydock`. Change them in their own repos and release a new tag, then move the pin here.
- The check command is `bun run check`. It also runs `vrui-check`; fix everything it reports. List classes sand defines in its own CSS, and extra theme color roles, under `vrui` in the root `package.json`.
- `sand.toml` silently ignores unknown keys, so check the plugin's config schema for exact section and key names.

## Test on your own sand

Never stop, restart or reload the live sand (`~/.sand`, port 4317). `sand` on the PATH is the installed build, so run this source with `bun run sand`.

- `bun run sand sandbox` starts a throwaway sand from this source in a temp home, on a free port and off the network, with the user's plugins and model. It prints the home, a link that opens the web UI paired (use Playwright), and the stop command. Delete the home after stopping it.
- `bun run sand --home "<sandbox home>" -p "<prompt>"` runs one prompt in it, without the web UI. Flags go before `-p`. Use it to check the agent loop and server-side features; don't build or adapt features for `-p`.

## Shared machine

- Other agents may be editing this tree at the same time. Only touch files your task needs, don't revert or reformat changes you didn't make, don't run repo-wide formatters, and don't touch the git index (`add`, `reset`, `stash`, `checkout --`) unless asked.
- Never use `pkill -f`, `pgrep -f` or `killall`; they match your own shell. Kill by PID, and leave nothing running.
- Ask before benchmarks or anything that loads the whole laptop for a long time.
