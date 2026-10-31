import { sig, type Sig } from '@vaakx-dev/vrui'

export interface CreateDraft {
  title: Sig<string>
  body: Sig<string>
  draft: Sig<boolean>
  written: boolean
}

export const createDrafts = () => {
  const drafts = new Map<string, CreateDraft>()
  return {
    of(session: string) {
      const found = drafts.get(session)
      if (found) return found
      const made: CreateDraft = { title: sig(''), body: sig(''), draft: sig(false), written: false }
      drafts.set(session, made)
      return made
    },
    clear: (session: string) => void drafts.delete(session),
  }
}
