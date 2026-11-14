import { isRecord } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import type { ModelPrice } from '../contract'

const anyHeader = /^\s*\[/
const probe = 'sand_price_probe'

const fieldsOf = ({ input, output, cacheRead, cacheWrite, cacheWriteLong }: ModelPrice) => ({
  input,
  output,
  cache_read: cacheRead,
  cache_write: cacheWrite,
  ...(cacheWriteLong !== undefined && { cache_write_long: cacheWriteLong }),
})

const parsed = (text: string) => {
  try {
    return Bun.TOML.parse(text)
  } catch {
    return undefined
  }
}

const field = (value: unknown, key: string) => (isRecord(value) ? value[key] : undefined)

const tableOf = (text: string, model: string) => ['plugins', 'accounts', 'prices', model].reduce(field, parsed(text))

const heads = (line: string, model: string) => {
  if (!anyHeader.test(line) || line.trim().startsWith('[[')) return false
  const table = tableOf(`${line}\n${probe} = 1`, model)
  return isRecord(table) && table[probe] === 1
}

const edited = (text: string, model: string, price: ModelPrice) => {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.length ? text.split(/\r?\n/) : []
  const body = Object.entries(fieldsOf(price)).map(([key, value]) => `${key} = ${value}`)
  const start = lines.findIndex(line => heads(line, model))
  if (start < 0) return [text.trimEnd(), '', `[plugins.accounts.prices.${JSON.stringify(model)}]`, ...body].join(eol).trimStart() + eol
  const next = lines.findIndex((line, index) => index > start && anyHeader.test(line))
  const end = next < 0 ? lines.length : next
  return [...lines.slice(0, start + 1), ...body, ...(next < 0 ? [] : ['']), ...lines.slice(end)].join(eol).replace(/\s*$/, eol)
}

const writePrice = async (path: string, model: string, price: ModelPrice) => {
  const file = Bun.file(path)
  const text = edited((await file.exists()) ? await file.text() : '', model, price)
  if (!Bun.deepEquals(tableOf(text, model), fieldsOf(price))) {
    throw new Error(`Couldn't set the price of ${model} in ${path}; set it there by hand under [plugins.accounts.prices.${JSON.stringify(model)}]`)
  }
  await writeAtomic(path, text)
}

export { writePrice }
