import type { Message, ToolCallBlock } from '@sand/chats/contract'
import { expandHome, fromMsys } from '@sand/util/fs'
import { dirname } from 'node:path'
import { z } from 'zod'

interface Trail {
  folders: string[]
  files: string[]
}

const FILE_FIELDS = ['path', 'file_path', 'filePath', 'file', 'notebook_path']
const FOLDER_FIELDS = ['cwd', 'workdir', 'directory', 'dir']
const COMMAND_FIELDS = ['command', 'cmd', 'script']

const CHANGE_FOLDER = /(?:^|&&|\|\||[;\n(])\s*(?:cd|pushd|Set-Location|sl)\s+(?:-\w+\s+)*("[^"]+"|'[^']+'|[^\s;&|)]+)/gi

const located = (path: string, base: string) => expandHome(fromMsys(path), base)

const unquoted = (operand: string) => operand.replace(/^(["'])(.*)\1$/, '$2')

const strings = (input: Record<string, unknown>, fields: string[]) => fields.map(field => input[field]).filter((value): value is string => typeof value === 'string' && value.trim() !== '')

const operands = (command: string) => [...command.matchAll(CHANGE_FOLDER)].map(match => unquoted(match[1]!)).filter(operand => operand !== '-' && !operand.includes('$'))

const foldersOf = (command: string, start: string) =>
  operands(command).reduce<string[]>((visited, operand) => [...visited, located(operand, visited.at(-1) ?? start)], [])

const toolInput = z.record(z.string(), z.unknown()).catch({})

const callTrail = (call: ToolCallBlock, cwd: string): Trail => {
  const input = toolInput.parse(call.input)
  const base = strings(input, FOLDER_FIELDS).map(folder => located(folder, cwd))[0] ?? cwd
  const files = strings(input, FILE_FIELDS).map(file => located(file, base))
  const commands = strings(input, COMMAND_FIELDS).flatMap(command => foldersOf(command, base))
  const folders = [...(base === cwd ? [] : [base]), ...files.map(file => dirname(file)), ...commands]
  return { folders, files }
}

const toolCalls = (messages: Message[]) =>
  messages.flatMap(message => (message.role === 'assistant' ? message.content.filter((block): block is ToolCallBlock => block.type === 'tool_call') : []))

const latestFirst = (paths: string[]) => [...new Set(paths.toReversed())]

const trailOf = (messages: Message[], cwd: string): Trail => {
  const trails = toolCalls(messages).map(call => callTrail(call, cwd))
  return { folders: latestFirst(trails.flatMap(trail => trail.folders)), files: latestFirst(trails.flatMap(trail => trail.files)) }
}

export { located, trailOf, type Trail }
