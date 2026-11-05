import { bearer } from '@sand/util/host'
import type { PlanCall } from '../contract'
import type { ApiKey } from '../auth/store'
import { trimSlash } from '@sand/util'
import type { openaiBody } from './body'

const defaultBase = 'https://api.openai.com/v1'

export const keyCall = (credential: ApiKey, payload: ReturnType<typeof openaiBody>): PlanCall => ({
  url: `${trimSlash(credential.base_url ?? defaultBase)}/responses`,
  payload,
  headers: () => ({ ...bearer(credential.key), accept: 'text/event-stream', 'content-type': 'application/json' }),
})
