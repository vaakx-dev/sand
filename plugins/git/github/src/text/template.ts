import { isMissing } from '@sand/util/fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const templateChars = 8000
const folders = ['.github', '', 'docs']
const names = ['pull_request_template.md', 'PULL_REQUEST_TEMPLATE.md']

const readFirst = async (paths: string[]) => {
  for (const path of paths) {
    const file = Bun.file(path)
    if (await file.exists()) return file.text()
  }
  return undefined
}

const entriesOf = async (folder: string) => {
  try {
    return await readdir(folder)
  } catch (error) {
    if (isMissing(error)) return []
    throw error
  }
}

const fromTemplateFolder = async (root: string) => {
  const folder = join(root, '.github', 'PULL_REQUEST_TEMPLATE')
  const entries = await entriesOf(folder)
  const first = entries.filter(entry => entry.toLowerCase().endsWith('.md')).sort()[0]
  return first ? Bun.file(join(folder, first)).text() : undefined
}

export const readTemplate = async (root: string) => {
  const single = await readFirst(folders.flatMap(folder => names.map(name => join(root, folder, name))))
  const text = (single ?? (await fromTemplateFolder(root)))?.trim()
  return text ? text.slice(0, templateChars) : undefined
}
