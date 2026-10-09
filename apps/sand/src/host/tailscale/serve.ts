import { type CommandResult, runTailscale } from './binary'
import { sandTarget } from './status'

const serveTimeout = 20_000

const explain = (result: CommandResult) => {
  const output = [result.stderr, result.stdout].map(text => text.trim()).filter(Boolean).join('\n')
  const consent = output.match(/https:\/\/login\.tailscale\.com\/[^\s"'<>]+/)?.[0]
  if (consent) return `Turn on HTTPS for your tailnet: ${consent}`
  if (/operator|access denied/i.test(output)) return `Tailscale refused the change. Allow it with: sudo tailscale set --operator=$USER`
  if (result.timedOut) return `tailscale serve did not finish within ${serveTimeout / 1000} s`
  return output || `tailscale serve failed with exit code ${result.code}`
}

const serve = async (binary: string, args: string[]) => {
  const result = await runTailscale(binary, ['serve', ...args], serveTimeout)
  return result.code === 0 && !result.timedOut ? undefined : explain(result)
}

export const serveOn = (binary: string, port: number) => {
  if (!port) return Promise.resolve('Set a fixed [host] port in sand.toml to use Tailscale HTTPS')
  return serve(binary, ['--bg', '--https=443', sandTarget(port)])
}

export const serveOff = (binary: string) => serve(binary, ['--https=443', 'off'])
