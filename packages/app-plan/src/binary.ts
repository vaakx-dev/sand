interface BinarySpec {
  command: string
  app: string
  install: string
  installed: string[]
  native?(found: string): Promise<string | undefined>
}

interface Binary {
  app: string
  install: string
  find(): Promise<string | undefined>
  require(): Promise<string>
}

const firstExisting = async (paths: string[]) => {
  for (const path of paths) if (await Bun.file(path).exists()) return path
  return undefined
}

const appBinary = ({ command, app, install, installed, native }: BinarySpec): Binary => {
  const located = async () => Bun.which(command) ?? (await firstExisting(installed))

  const find = async () => {
    const found = await located()
    return found && ((await native?.(found)) ?? found)
  }

  return {
    app,
    install,
    find,
    async require() {
      const found = await find()
      if (!found) throw new Error(`${app} isn't installed on this PC. Install it from ${install}, sign in with \`${command}\`, then try again.`)
      return found
    },
  }
}

const stoppedError = (app: string, code: number, stderr: string) => new Error(`${app} stopped (exit ${code})${stderr ? `: ${stderr.split('\n').slice(-3).join(' ')}` : ''}`)

export { appBinary, stoppedError, type Binary }
