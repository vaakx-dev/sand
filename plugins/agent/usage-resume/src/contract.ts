import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export interface Resume {
  turn: string
  at: number
}

export const helloResumes = helloField<Resume[]>('resumes')

export const resumesChange = wireEvent<Resume[]>('resumes.change')

export interface Alternative {
  model: string
  label: string
  account: string
}

export const resumeAlternative = request('resume.alternative', { input: () => z.object({ turn: z.string() }), output: type<Alternative | undefined>() })

export const resumeSwitch = request('resume.switch', { input: () => z.object({ turn: z.string(), model: z.string() }), output: type<void>() })

export const resumeCancel = request('resume.cancel', { input: () => z.object({ turn: z.string() }), output: type<void>() })
