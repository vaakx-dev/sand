import { isRecord } from '@sand/util'
import { apiHeaders, apiUrl } from '../api/endpoint'
import { reachError } from '../api/errors'

const timeoutMs = 15_000

export type UserCheck = { ok: true; login: string } | { ok: false; rejected: boolean; message: string }

export const checkUser = async (token: string): Promise<UserCheck> => {
  try {
    const response = await fetch(`${apiUrl}/user`, { headers: apiHeaders(token), signal: AbortSignal.timeout(timeoutMs) })
    if (response.status === 401) return { ok: false, rejected: true, message: "GitHub didn't accept this PC's sign-in." }
    if (!response.ok) return { ok: false, rejected: false, message: `GitHub answered HTTP ${response.status} when checking the sign-in.` }
    const data: unknown = await response.json()
    const login = isRecord(data) && typeof data.login === 'string' ? data.login : undefined
    return login ? { ok: true, login } : { ok: false, rejected: false, message: "GitHub sent an answer sand couldn't read." }
  } catch (error) {
    return { ok: false, rejected: false, message: reachError(error, timeoutMs).message }
  }
}
