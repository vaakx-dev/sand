import { inhibitor } from './inhibitor'
import { executionState } from './windows'

interface SleepBlock {
  hold(): void
  release(): void
}

type Warn = (problem: string) => void

const MAC = ['caffeinate', '-i']

const LINUX = ['systemd-inhibit', '--what=sleep', '--mode=block', '--who=sand', '--why=A chat is working']

const unavailable = (problem: string, warn: Warn): SleepBlock => {
  warn(problem)
  return { hold: () => {}, release: () => {} }
}

const linuxBlock = (warn: Warn) =>
  Bun.which('systemd-inhibit') ? inhibitor(LINUX, warn) : unavailable('systemd-inhibit is missing, so this PC has no systemd to ask', warn)

const sleepBlock = (warn: Warn): SleepBlock => {
  switch (process.platform) {
    case 'win32':
      return executionState()
    case 'darwin':
      return inhibitor(MAC, warn)
    case 'linux':
      return linuxBlock(warn)
    default:
      return unavailable(`sand can't block sleep on ${process.platform}`, warn)
  }
}

export { sleepBlock, type SleepBlock, type Warn }
