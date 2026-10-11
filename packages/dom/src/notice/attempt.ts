import { errorMessage } from '@sand/kit'

export interface Notice {
  push(text: string, options: { level: 'info' | 'error' }): void
}

export const attempt = (notify: Notice | undefined, failed: string, work: () => Promise<unknown>) =>
  work().catch(error => notify?.push(`${failed}: ${errorMessage(error)}`, { level: 'error' }))
