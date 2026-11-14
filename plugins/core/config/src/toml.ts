import { isRecord } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'

type TomlValue = string | number | boolean

type TomlValues = Record<string, TomlValue | undefined>

const anyHeader = /^\s*\[/
const probe = 'sand_table_probe'

const parsed = (text: string) => {
  try {
    return Bun.TOML.parse(text)
  } catch {
    return undefined
  }
}

const field = (value: unknown, key: string) => (isRecord(value) ? value[key] : undefined)

const tableIn = (text: string, table: string[]) => table.reduce(field, parsed(text))

const keyText = (key: string) => (/^[\w-]+$/.test(key) ? key : JSON.stringify(key))

const valueText = (value: TomlValue) => (typeof value === 'string' ? JSON.stringify(value) : String(value))

const keyOf = (line: string) => {
  const entry = parsed(line)
  return isRecord(entry) ? Object.keys(entry)[0] : undefined
}

const heads = (line: string, table: string[]) => {
  if (!anyHeader.test(line) || line.trim().startsWith('[[')) return false
  return field(tableIn(`${line}\n${probe} = 1`, table), probe) === 1
}

const headerAt = (lines: string[], table: string[]) => {
  const found = lines.findIndex(line => heads(line, table))
  if (found >= 0) return { lines, start: found }
  const kept = lines.slice(0, lines.findLastIndex(line => line.trim()) + 1)
  const opened = [...kept, ...(kept.length ? [''] : []), `[${table.map(keyText).join('.')}]`]
  return { lines: opened, start: opened.length - 1 }
}

const edited = (text: string, table: string[], values: TomlValues) => {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const { lines, start } = headerAt(text.length ? text.split(/\r?\n/) : [], table)
  const next = lines.findIndex((line, index) => index > start && anyHeader.test(line))
  const end = next < 0 ? lines.length : next
  const kept = lines.slice(start + 1, end).filter(line => !Object.hasOwn(values, keyOf(line) ?? ''))
  while (kept.length && !kept.at(-1)!.trim()) kept.pop()
  const set = Object.entries(values).flatMap(([key, value]) => (value === undefined ? [] : [`${keyText(key)} = ${valueText(value)}`]))
  const section = [...kept, ...set, ...(next < 0 ? [] : [''])]
  return [...lines.slice(0, start + 1), ...section, ...lines.slice(end)].join(eol).replace(/\s*$/, eol)
}

const holds = (text: string, table: string[], values: TomlValues) => {
  const found = tableIn(text, table)
  return isRecord(found) && Object.entries(values).every(([key, value]) => found[key] === value)
}

const setTomlValues = async (path: string, table: string[], values: TomlValues) => {
  const file = Bun.file(path)
  const text = edited((await file.exists()) ? await file.text() : '', table, values)
  if (!holds(text, table, values)) throw new Error(`Couldn't update [${table.map(keyText).join('.')}] in ${path}; set it there by hand`)
  await writeAtomic(path, text)
}

export { setTomlValues, type TomlValue, type TomlValues }
