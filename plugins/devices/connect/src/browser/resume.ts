import type { ResumeStore, SavedResume } from '@sand/devices-contract'
import { isRecord } from '@sand/util'
import { isSavedResume } from '../resume/valid'
import { readStored, writeStored } from './integrations/storage'

export const browserResumeKey = 'sand.resume'

const readAll = (): Record<string, SavedResume> => {
  const saved = readStored(browserResumeKey)
  if (!isRecord(saved)) return {}
  return Object.fromEntries(Object.entries(saved).filter((entry): entry is [string, SavedResume] => isSavedResume(entry[1])))
}

export const browserResumeStore = (): ResumeStore => ({
  load: pc => readAll()[pc],
  save(pc, resume) {
    writeStored(browserResumeKey, { ...readAll(), [pc]: resume })
  },
  forget(pc) {
    writeStored(browserResumeKey, Object.fromEntries(Object.entries(readAll()).filter(([saved]) => saved !== pc)))
  },
})
