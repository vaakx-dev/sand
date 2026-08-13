# Sand

Sand is an extension-native desktop client for ACP coding agents. The desktop owns the workbench and workspace state without bundling an agent or agent harness.

Extensions target the app, the UI, or both. Agents run separately and connect through ACP.

## Codex CLI

The Codex extension is included but stays disconnected when Sand starts. Use the Codex button in
the workbench header to connect or disconnect the `codex` executable found in `PATH`. The extension
owns the bridge between Sand's ACP client and `codex app-server`.

Sand is currently in alpha and changing quickly.

## Install

Download Sand from the [latest release](../../releases/latest).
