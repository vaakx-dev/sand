import type { CommandResult } from './binary'

export const tailscaleErrors = {
  notInstalled: "Tailscale isn't installed on this PC. Install it from tailscale.com, sign in, then try again.",
  notRunning: "Tailscale isn't running or isn't signed in on this PC. Open Tailscale, sign in, then try again.",
  fixedPort:
    'Tailscale HTTPS needs sand on a fixed port. Set port under [host] in sand.toml (for example port = 4317), restart sand, then try again.',
  saveFailed: (reason: string) => `sand couldn't save the Tailscale setting: ${reason}`,
  occupied: (target: string) =>
    `Tailscale HTTPS on this PC already serves ${target}. sand won't replace it. Turn it off with "tailscale serve --https=443 off" first.`,
  noAnswer: (seconds: number) => `Tailscale didn't answer within ${seconds} seconds. Check that Tailscale is running.`,
}

export const explainServe = (result: CommandResult, on: boolean, timeout: number) => {
  const output = [result.stderr, result.stdout].map(text => text.trim()).filter(Boolean).join('\n')
  const consent = output.match(/https:\/\/login\.tailscale\.com\/[^\s"'<>]+/)?.[0]
  if (consent) return `Turn on HTTPS for your tailnet first, then try again: ${consent}`
  if (/operator|access denied/i.test(output))
    return 'Tailscale did not let sand change its settings. Run "sudo tailscale set --operator=$USER" once, then try again.'
  if (result.timedOut) return tailscaleErrors.noAnswer(timeout / 1000)
  const action = on ? 'turn on' : 'turn off'
  return output ? `Tailscale couldn't ${action} HTTPS: ${output}` : `Tailscale couldn't ${action} HTTPS (exit code ${result.code}).`
}
