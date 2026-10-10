export interface GhResult {
  code: number
  stdout: string
  stderr: string
}

const missing: GhResult = { code: -1, stdout: '', stderr: 'gh is not installed on this PC' }

export const ghPath = () => Bun.which('gh')

export const ghEnv = () => {
  const { GH_TOKEN: _, GITHUB_TOKEN: __, ...rest } = process.env
  return { ...rest, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' }
}

export const gh = async (args: string[], timeout = 15_000): Promise<GhResult> => {
  const path = ghPath()
  if (!path) return missing
  const child = Bun.spawn([path, ...args], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', env: ghEnv(), windowsHide: true })
  const timer = setTimeout(() => child.kill(), timeout)
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  clearTimeout(timer)
  return { code, stdout, stderr }
}
