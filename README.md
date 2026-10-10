# sand

sand is a coding agent that runs on your own computers. Every part of it is a plugin, including the chat, the sidebar, the tools and the model picker. You can ask sand to change any part of itself, and it loads the change without a restart.

## Why use sand

sand has 68 plugins and no built-in features. Unloading a plugin removes everything it added. Ask sand for a new panel or a different tool, and it writes the plugin and loads it with `/reload` while your thread stays open.

sand runs as a server on your PC, and the browser is only a window onto it. A thread keeps running when you close the tab. You can open the same thread on your phone at home, or anywhere through Tailscale.

You can pair several PCs. A thread runs on the PC that has the project folder, and you can move a thread to another PC to continue it there. Paired PCs can share accounts and plugins.

You can sign in with a Claude or ChatGPT subscription, or add API keys. The usage page splits usage by provider.

## Get started

On Linux or macOS, run this in a terminal:

```sh
curl -fsSL https://vaakx-dev.github.io/sand/install.sh | sh
```

On Windows, run this in PowerShell:

```powershell
irm https://vaakx-dev.github.io/sand/install.ps1 | iex
```

The installer downloads Bun and the newest sand release from GitHub into `~/.sand`, adds `sand` to your PATH, and opens sand in your browser. To sign in, open **Settings** and then **Accounts**. sand checks GitHub for updates and installs one when you click **Update** in **Settings**.

To install the nightly build instead, run `curl -fsSL https://vaakx-dev.github.io/sand/install.sh | sh -s -- --nightly`, or on Windows run `$env:SAND_CHANNEL='nightly'` before the command. For the dev build, use `--dev` or `$env:SAND_CHANNEL='dev'`. You can switch later with **Updates from** in **Settings**.

To add a phone, open **Your PCs** and scan the QR code. To add a PC, open **Your PCs**, choose **Add a PC**, and run the command it shows on the new PC. It runs the same installer and pairs the new PC with this one.

To work on sand itself, run it from a clone instead: see [Working on sand](docs/development.md).

## Versions

sand is in alpha, and things can change between releases. Each GitHub release, such as `v0.1.0-alpha.1`, never changes. The `nightly` tag points to the newest commit on `main` that passed the checks, and moves at most once a day. The `dev` tag moves with every push to `main` that passes the checks.

sand is built on [drydock](https://github.com/vaakx-dev/drydock) and [VRUI](https://github.com/vaakx-dev/vrui). To work on sand itself, read [Working on sand](docs/development.md).
