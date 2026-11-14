import { appsFolder } from '@sand/boot'
import { trimSlash } from '@sand/util'
import { defaultHome } from '@sand/util/fs'
import { resolve } from 'node:path'
import { commandLine } from './command-line'

const sandMain = 'apps/sand/src/main.ts'
const serveWord = /\sserve(\s|$)/
const homeFlag = /--home(?:=|\s+)(?:"([^"]+)"|(\S+))/

const comparable = (text: string) => {
  const slashed = text.replaceAll('\\', '/')
  return process.platform === 'win32' ? slashed.toLowerCase() : slashed
}

export const folder = (path: string) => trimSlash(comparable(resolve(path)))

const namedHome = (line: string) => {
  const found = line.match(homeFlag)
  const named = found?.[1] ?? found?.[2]
  return named === undefined ? undefined : folder(named)
}

const servesThis = (line: string, home: string) => {
  const named = namedHome(line)
  if (named !== undefined) return named === folder(home)
  return line.includes(`${folder(appsFolder(home))}/`) || folder(home) === folder(defaultHome())
}

export const servesHome = async (pid: number, home: string) => {
  const line = await commandLine(pid)
  if (!line) return false
  const text = comparable(line)
  return text.includes(sandMain) && serveWord.test(text) && servesThis(text, home)
}
