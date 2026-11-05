const exec = (command: string[]) => {
  const { exitCode, stdout, stderr } = Bun.spawnSync(command, { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  return { ok: exitCode === 0, output: `${stdout}${stderr}`.trim() }
}

export const succeeds = (command: string[]) => exec(command).ok

export const mustRun = (command: string[]) => {
  const { ok, output } = exec(command)
  if (!ok) throw new Error(`${command.join(' ')} failed${output ? `: ${output}` : ''}`)
}
