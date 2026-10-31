import { parsePullRef, type PullRef, samePull } from '@sand/github/contract'

const commandStart = String.raw`(?:^|[;&|({\n]|\b(?:do|then|else)\s)\s*(?:(?:\w+=\S*|env|time|nohup|timeout\s+\S+)\s+)*`
const createCommand = new RegExp(String.raw`${commandStart}gh\s+pr\s+create(?=$|[\s;&|)])`, 'g')
const heredocBody = /<<-?[ \t]*(['"]?)(\w+)\1[^\n]*\n(?:(?:[\s\S]*?\n)?[ \t]*\2[ \t]*(?=\n|$)|[\s\S]*$)/g
const quotedOrComment = /'[^']*'|"(?:\\[\s\S]|[^"\\])*"|(?<=^|[\s;&|(])#[^\n]*/gm
const listsPulls = /\bgh\s+(?:pr\s+(?:list|status)|search\s+prs|api)\b/
const urlLine = /^[ \t]*(https?:\/\/\S+)[ \t]*$/gm

const codeOf = (command: string) => command.replace(heredocBody, '<<').replace(quotedOrComment, "''")

const pullsIn = (output: string) =>
  [...output.matchAll(urlLine)].reduce<PullRef[]>((found, [, url = '']) => {
    const parsed = parsePullRef(url)
    if (!parsed?.repo || found.some(known => samePull(known, parsed))) return found
    return [...found, { repo: parsed.repo, number: parsed.number }]
  }, [])

export const createdPulls = (command: string, output: string): PullRef[] => {
  const code = codeOf(command)
  const creates = [...code.matchAll(createCommand)].length
  if (!creates || listsPulls.test(code)) return []
  const found = pullsIn(output)
  return found.length > creates ? [] : found
}
