interface GhResult {
  code: number
  stdout: string
  stderr: string
}

export const ghMissing = 'gh is not installed on this PC'

const ghEnv = () => {
  const { GH_TOKEN: _, GITHUB_TOKEN: __, ...rest } = process.env
  return { ...rest, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' }
}

export const spawnGh = (args: string[], timeout: number) => {
  const path = Bun.which('gh')
  if (!path) return undefined
  return Bun.spawn([path, ...args], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', env: ghEnv(), timeout, windowsHide: true })
}

export const gh = async (args: string[], timeout = 15_000): Promise<GhResult> => {
  const child = spawnGh(args, timeout)
  if (!child) return { code: -1, stdout: '', stderr: ghMissing }
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { code, stdout, stderr }
}
