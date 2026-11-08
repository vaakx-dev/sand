const prefix = 'Nothing answers '

export const nothingAnswers = (type: string) => new Error(`${prefix}${type}`)

export const unanswered = (error: unknown) => (error instanceof Error ? error.message : String(error)).startsWith(prefix)
