import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export interface Resume {
  turn: string
  at: number
}

export const helloResumes = helloField<Resume[]>('resumes')

export const resumesChange = wireEvent<Resume[]>('resumes.change')

export const resumeCancel = request('resume.cancel', { input: () => z.object({ turn: z.string() }), output: type<void>() })
