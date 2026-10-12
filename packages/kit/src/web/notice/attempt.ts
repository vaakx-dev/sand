import type { Notice } from '@sand/protocol'
import { errorMessage } from '../../text/error'

export const attempt = (notify: Notice | undefined, failed: string, work: () => Promise<unknown>) =>
  work().catch(error => notify?.push(`${failed}: ${errorMessage(error)}`, { level: 'error' }))
