const fenced = (value: unknown) => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``

const item = (value: unknown) => (typeof value === 'string' ? value.trim() : fenced(value))

export const describeResult = (value: unknown) => {
  if (value === undefined || value === null) return 'The workflow finished without a result.'
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return fenced(value)
  if (value.length === 1) return item(value[0])
  return value.map((entry, index) => `## Result ${index + 1} of ${value.length}\n\n${item(entry)}`).join('\n\n')
}
