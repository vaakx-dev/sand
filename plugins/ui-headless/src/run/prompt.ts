import type { Attachments, Cli, Prompt } from '@sand/protocol'
import { parseCommand } from '@sand/kit'
import { relative, resolve } from 'node:path'

const relativeName = (cwd: string, file: string) => relative(cwd, resolve(cwd, file)).replaceAll('\\', '/')

const mention = (path: string) => (/\s/.test(path) ? `@"${path}"` : `@${path}`)

export const commandOf = ({ flags }: Cli, prompt: string) => (flags.attach?.length || flags.files?.length ? undefined : parseCommand(prompt.trim()))

export const composePrompt = async (cli: Cli, prompt: string, attachments?: Attachments): Promise<Prompt> => {
  const { attach = [], files = [] } = cli.flags
  const text = files.length ? `${prompt}\n\n${files.map(file => mention(relativeName(cli.cwd, file))).join(' ')}` : prompt
  if (!attach.length) return text
  if (!attachments) throw new Error('The attachments plugin is not loaded')
  const items = await Promise.all(attach.map(file => attachments.fromFile(resolve(cli.cwd, file))))
  return attachments.compose(text, items)
}
