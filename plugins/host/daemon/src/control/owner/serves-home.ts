import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { appsFolder } from '@sand/util/boot'
import { commandLine } from './command-line'

const sandMain = 'apps/sand/src/main.ts'
const serveWord = /\sserve(\s|$)/
const homeFlag = /--home(?:=|\s+)(?:"([^"]+)"|(\S+))/

const comparable = (text: string) => {
  const slashed = text.replaceAll('\\', '/')
  return process.platform === 'win32' ? slashed.toLowerCase() : slashed
}

const folder = (path: string) => comparable(resolve(path)).replace(/\/+$/, '')

const namedHome = (line: string) => {
  const found = line.match(homeFlag)
  const named = found?.[1] ?? found?.[2]
  return named === undefined ? undefined : folder(named)
}

const servesThis = (line: string, home: string) => {
  const named = namedHome(line)
  if (named !== undefined) return named === folder(home)
  return line.includes(`${folder(appsFolder(home))}/`) || folder(home) === folder(join(homedir(), '.sand'))
}

export const servesHome = async (pid: number, home: string) => {
  const line = await commandLine(pid)
  if (!line) return false
  const text = comparable(line)
  return text.includes(sandMain) && serveWord.test(text) && servesThis(text, home)
}
