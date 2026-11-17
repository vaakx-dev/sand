import type { ResumeStore, SavedResume } from '@sand/devices-contract'
import { savedResumeSchema } from '../resume/valid'
import { validEntries } from '../saved/entries'
import { readStored, writeStored } from './integrations/storage'

export const browserResumeKey = 'sand.resume'

const readAll = (): Record<string, SavedResume> => validEntries(readStored(browserResumeKey), savedResumeSchema())

export const browserResumeStore = (): ResumeStore => ({
  load: pc => readAll()[pc],
  save(pc, resume) {
    writeStored(browserResumeKey, { ...readAll(), [pc]: resume })
  },
  forget(pc) {
    writeStored(browserResumeKey, Object.fromEntries(Object.entries(readAll()).filter(([saved]) => saved !== pc)))
  },
})
