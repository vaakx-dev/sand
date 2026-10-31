export const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))
