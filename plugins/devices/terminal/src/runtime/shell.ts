type Which = (command: string) => string | null | undefined

export const shellCommand = (platform: NodeJS.Platform, env: Record<string, string | undefined>, which: Which): string[] => {
  if (platform === 'win32') {
    const powerShell = which('pwsh') ?? which('powershell')
    return powerShell ? [powerShell, '-NoLogo'] : [env.ComSpec ?? 'cmd.exe']
  }
  return [env.SHELL || which('bash') || which('sh') || '/bin/sh']
}

const inherited = /^(TMUX|TMUX_PANE|STY|WINDOW|ZELLIJ(_.*)?|SAND_RUNTIME_ID)$/i

export const shellEnv = (env: Record<string, string | undefined>) => ({
  ...Object.fromEntries(Object.entries(env).filter(([name]) => !inherited.test(name))),
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
})
