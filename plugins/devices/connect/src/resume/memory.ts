import type { ResumeStore, SavedResume } from '@sand/devices-contract'

export const memoryResumeStore = (): ResumeStore => {
  const saved = new Map<string, SavedResume>()
  return {
    load: pc => saved.get(pc),
    save: (pc, resume) => void saved.set(pc, resume),
    forget: pc => void saved.delete(pc),
  }
}
