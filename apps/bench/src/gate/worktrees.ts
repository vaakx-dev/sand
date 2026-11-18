import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Page } from 'playwright'

interface Listed {
  listMs: number
  slowestReplyMs: number
}

const WORKTREES = 40
const FOLDERS = 50
const FILES_PER_FOLDER = 50
const FILE_TEXT = 'A line of bench text that fills a source file.\n'.repeat(20)

const AUTHOR = { GIT_AUTHOR_NAME: 'Bench', GIT_AUTHOR_EMAIL: 'bench@example.com', GIT_COMMITTER_NAME: 'Bench', GIT_COMMITTER_EMAIL: 'bench@example.com' }

const git = (cwd: string, ...args: string[]) => {
  const run = Bun.spawnSync(['git', ...args], { cwd, env: { ...process.env, ...AUTHOR } })
  if (run.exitCode !== 0) throw new Error(`git ${args.join(' ')} failed: ${run.stderr.toString()}`)
}

const fillRepo = (repo: string) => {
  for (let folder = 0; folder < FOLDERS; folder++) {
    mkdirSync(join(repo, `part${folder}`), { recursive: true })
    for (let file = 0; file < FILES_PER_FOLDER; file++) writeFileSync(join(repo, `part${folder}`, `file${file}.ts`), FILE_TEXT)
  }
}

const record = (main: string, path: string, index: number) => ({ id: `bench-${index}`, path, main, branch: `bench-${index}`, base: 'main', sessions: [], created: Date.now() })

const makeWorktrees = () => {
  const root = mkdtempSync(join(tmpdir(), 'sand-bench-worktrees-'))
  const main = join(root, 'repo')
  mkdirSync(main)
  git(main, 'init', '-q', '-b', 'main')
  fillRepo(main)
  git(main, 'add', '.')
  git(main, 'commit', '-q', '-m', 'bench files')
  const records = Array.from({ length: WORKTREES }, (_, index) => {
    const path = join(root, 'trees', `tree${index}`)
    git(main, 'worktree', 'add', '-q', '-b', `bench-${index}`, path)
    return record(main, path, index)
  })
  return { root, records: JSON.stringify({ worktrees: Object.fromEntries(records.map(each => [each.path, each])) }) }
}

const writeRecords = (home: string, records: string) => writeFileSync(join(home, 'worktrees.json'), records)

const listed = (page: Page) =>
  page.evaluate(async (): Promise<Listed> => {
    const began = performance.now()
    let done = false
    const listing = Promise.all([window.bench.ask('worktrees.status', {}), window.bench.ask('worktrees.sizes', {})]).then(() => {
      done = true
      return performance.now() - began
    })
    let slowestReplyMs = 0
    while (!done) {
      const sent = performance.now()
      await window.bench.ask('levels.get', {})
      slowestReplyMs = Math.max(slowestReplyMs, performance.now() - sent)
    }
    return { listMs: await listing, slowestReplyMs }
  })

export { listed, makeWorktrees, WORKTREES, writeRecords }
