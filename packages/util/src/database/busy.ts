export const databaseBusy = (error: unknown) => error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('SQLITE_BUSY')
