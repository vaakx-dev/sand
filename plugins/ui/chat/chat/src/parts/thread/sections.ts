const heading = /^#{2,3} Result \d+ of \d+[ \t]*$/m

const parsed = (text: string) => {
  if (!/^[[{]/.test(text)) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

const isTexts = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string')

export const resultSections = (text: string): string[] => {
  const trimmed = text.trim()
  const value = parsed(trimmed)
  if (isTexts(value)) return value.map(item => item.trim())
  if (value !== undefined) return [`\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``]
  if (!heading.test(trimmed)) return [trimmed]
  return trimmed
    .split(new RegExp(heading.source, 'gm'))
    .map(part => part.trim())
    .filter(Boolean)
}
