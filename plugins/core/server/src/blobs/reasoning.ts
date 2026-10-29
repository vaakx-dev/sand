type Fields = Record<string, unknown>

export const unsigned = (fields: Fields): Fields => {
  if (fields.type === 'thinking' && typeof fields.signature === 'string') {
    const { signature, ...rest } = fields
    return rest
  }
  if (fields.type === 'redacted_thinking' && typeof fields.data === 'string' && fields.data) return { ...fields, data: '' }
  return fields
}
