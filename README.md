# sand

sand is a coding agent that runs on your own PCs. Every part of it is a plugin, from the chat to the tools. Ask sand to change any part of itself, and it reloads the change without closing your chat.

- Your projects are in the sidebar. Each project opens one chat with the agent, in that project's folder.
- The browser is only a window. A chat keeps running when you close the tab, and you can open it on your phone, or anywhere through Tailscale.
- You can pair several PCs. A project's chat runs on the PC that has the project.
- sand works with a Claude or ChatGPT plan, the Claude Code or Codex apps, or API keys.

## Install

On macOS or Linux, in a terminal:

```sh
curl -fsSL https://vaakx-dev.github.io/sand/install.sh | sh
```

On Windows, in PowerShell:

```powershell
irm https://vaakx-dev.github.io/sand/install.ps1 | iex
```

The installer puts Bun and sand in `~/.sand`, adds `sand` to your PATH and opens sand in your browser. Sign in under Settings → Accounts. To pair a phone or another PC, open Settings → Devices.

sand updates itself from Settings → Updates. On that page you can also switch to the nightly or dev builds.

## Working on sand

sand is built on [drydock](https://github.com/vaakx-dev/drydock) and [VRUI](https://github.com/vaakx-dev/vrui). To run it from a clone, see [docs/development.md](docs/development.md).

sand is MIT licensed.
