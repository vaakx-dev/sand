import type { LoadedPage } from '../contract'

const kept = 8

export interface CheckedPage {
  page: LoadedPage
  height: number
}

export const recentPages = () => {
  const bySession = new Map<string, CheckedPage>()
  return {
    remember(session: string, checked: CheckedPage) {
      bySession.delete(session)
      bySession.set(session, checked)
      const [oldest] = bySession.keys()
      if (bySession.size > kept && oldest) bySession.delete(oldest)
    },
    recall: (session: string) => bySession.get(session),
  }
}

export type RecentPages = ReturnType<typeof recentPages>
