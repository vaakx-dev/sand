type Fields = Record<string, unknown>

const isPlain = (value: object): value is Fields => {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const trimmedBlock = (fields: Fields): Fields => {
  if (fields.type === 'thinking' && typeof fields.signature === 'string') {
    const { signature, ...rest } = fields
    return rest
  }
  if (fields.type === 'redacted_thinking' && typeof fields.data === 'string' && fields.data) return { ...fields, data: '' }
  if ((fields.type === 'image' || fields.type === 'document') && typeof fields.data === 'string') {
    const { data, ...rest } = fields
    return rest
  }
  return fields
}

const trimArray = (value: unknown[]) => {
  let copy: unknown[] | undefined
  value.forEach((item, index) => {
    const next = trimForPage(item)
    if (next === item) return
    copy ??= [...value]
    copy[index] = next
  })
  return copy ?? value
}

const trimFields = (value: Fields) => {
  const block = trimmedBlock(value)
  if (block !== value) return block
  let copy: Fields | undefined
  for (const key in value) {
    const next = trimForPage(value[key])
    if (next === value[key]) continue
    copy ??= { ...value }
    copy[key] = next
  }
  return copy ?? value
}

export const trimForPage = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return trimArray(value)
  return isPlain(value) ? trimFields(value) : value
}
