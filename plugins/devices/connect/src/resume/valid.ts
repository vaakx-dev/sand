import type { Resume } from '@sand/devices-contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

const resumeSchema = lazy(() => z.object({ nonce: z.string(), expires: z.number() }))

const savedResumeSchema = lazy(() => resumeSchema().extend({ route: z.string(), signature: z.string() }))

const isResume = (value: unknown): value is Resume => resumeSchema().safeParse(value).success

export { isResume, savedResumeSchema }
