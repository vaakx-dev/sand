const prefix = 'openai-reasoning:'

export const encodeReasoning = (item: unknown) => `${prefix}${JSON.stringify(item)}`

export const isReasoning = (signature: string | undefined) => !!signature?.startsWith(prefix)

export const decodeReasoning = (signature: string | undefined): Record<string, unknown> | undefined => {
  if (!signature || !isReasoning(signature)) return undefined
  try {
    return JSON.parse(signature.slice(prefix.length))
  } catch {}
}
