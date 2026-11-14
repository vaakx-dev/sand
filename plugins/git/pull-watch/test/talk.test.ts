import type { GitHub } from '@sand/github/contract'
import { expect, test } from 'bun:test'
import { readTalk } from '../src/runtime/talk'

const user = (login: string) => ({ login })

const answers: Record<string, unknown> = {
  '/repos/acme/tiles/pulls/7': { title: 'Retry uploads', html_url: 'https://github.com/acme/tiles/pull/7' },
  '/repos/acme/tiles/pulls/7/comments?per_page=100': [
    { id: 1, user: user('mira'), path: 'src/upload.ts', line: 42, original_line: 40, body: 'Stop on 4xx.', html_url: 'c1', created_at: '2026-01-01T10:00:00Z' },
    { id: 2, in_reply_to_id: 1, user: user('ana'), path: 'src/upload.ts', line: 42, original_line: 40, body: 'Done.', html_url: 'c2', created_at: '2026-01-01T11:00:00Z' },
    { id: 3, user: null, path: 'src/old.ts', line: null, original_line: 9, body: 'Gone now?', html_url: 'c3', created_at: '2026-01-01T10:30:00Z' },
  ],
  '/repos/acme/tiles/pulls/7/reviews?per_page=100': [
    { id: 10, user: user('mira'), state: 'CHANGES_REQUESTED', body: '', html_url: 'r10', submitted_at: '2026-01-01T10:01:00Z' },
    { id: 11, user: user('ana'), state: 'COMMENTED', body: '', html_url: 'r11', submitted_at: '2026-01-01T11:00:00Z' },
    { id: 12, user: user('jon'), state: 'PENDING', body: 'Draft', html_url: 'r12' },
  ],
  '/repos/acme/tiles/issues/7/comments?per_page=100': [
    { id: 20, user: user('ci-bot'), body: '<!-- coverage: 81% -->', html_url: 'i20', created_at: '2026-01-01T09:00:00Z' },
    { id: 21, user: user('jon'), body: 'Looks good once CI is green.\r\n<!-- bookkeeping -->', html_url: 'i21', created_at: '2026-01-01T12:00:00Z' },
  ],
}

const github: Pick<GitHub, 'rest'> = { rest: async <T>(_method: string, path: string) => answers[path] as T }

test("a pull request's talk groups replies into review threads and keeps only what people wrote", async () => {
  const talk = await readTalk(github, { repo: 'acme/tiles', number: 7 })

  expect(talk.threads).toEqual([
    {
      id: '1',
      path: 'src/upload.ts',
      line: 42,
      outdated: false,
      remarks: [
        { id: '1', author: 'mira', body: 'Stop on 4xx.', url: 'c1', at: Date.parse('2026-01-01T10:00:00Z') },
        { id: '2', author: 'ana', body: 'Done.', url: 'c2', at: Date.parse('2026-01-01T11:00:00Z') },
      ],
    },
    { id: '3', path: 'src/old.ts', line: 9, outdated: true, remarks: [{ id: '3', author: 'ghost', body: 'Gone now?', url: 'c3', at: Date.parse('2026-01-01T10:30:00Z') }] },
  ])
  expect(talk.conversation.map(said => [said.author, said.verdict, said.body])).toEqual([
    ['mira', 'requested changes', ''],
    ['jon', undefined, 'Looks good once CI is green.'],
  ])
})
