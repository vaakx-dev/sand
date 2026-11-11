import type { GitHub } from '@sand/github/contract'
import { clip, oneLine, plural } from '@sand/util'
import { z } from 'zod'
import type { Change, Kind, KindContext } from '../contract'

const runType = 'WorkflowRunEvent'

const input = z.object({
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'use owner/name')
    .describe('The repository, as owner/name'),
  events: z
    .array(z.string())
    .optional()
    .describe(`Only these GitHub event types, like PushEvent, PullRequestEvent, IssuesEvent or ${runType} for failed CI runs`),
})

const seen = z.object({ event: z.string().optional(), runs: z.array(z.string()) })
type Seen = z.output<typeof seen>

const defaultPollMs = 60_000
const detailMost = 8_000
const failed = new Set(['failure', 'timed_out', 'startup_failure'])

interface Item {
  number: number
  title?: string
  body?: string | null
  merged?: boolean
  html_url?: string
}

interface Payload {
  action?: string
  ref?: string | null
  ref_type?: string
  size?: number
  commits?: { message: string }[]
  pull_request?: Item
  issue?: Item & { pull_request?: unknown }
  comment?: { body?: string }
  review?: { state?: string; body?: string | null }
  release?: { tag_name?: string; name?: string | null; body?: string | null }
  forkee?: { full_name?: string }
}

interface Event {
  id: string
  type: string
  actor?: { login?: string; display_login?: string }
  created_at: string
  payload: Payload
}

interface Run {
  id: number
  run_attempt?: number
  run_number: number
  name?: string | null
  display_title?: string
  head_branch?: string | null
  conclusion?: string | null
  event: string
  html_url: string
  updated_at: string
  actor?: { login?: string }
}

const normal = (type: string) => type.toLowerCase().replace(/[^a-z]/g, '').replace(/event$/, '')

const later = (id: string, than: string | undefined) => than === undefined || BigInt(id) > BigInt(than)


const branch = (ref: string | null | undefined) => ref?.replace(/^refs\/(heads|tags)\//, '') ?? ''

const titled = (label: string, item: Item) => `${label} #${item.number}${item.title ? `: ${item.title}` : ''}`

const pullAction = (payload: Payload) => (payload.action === 'closed' && payload.pull_request?.merged ? 'merged' : (payload.action ?? 'updated'))

const reviewVerb: Record<string, string> = { approved: 'approved', changes_requested: 'requested changes on', commented: 'reviewed' }

const pushed = (who: string, payload: Payload) => {
  const count = payload.size ?? payload.commits?.length
  return `${who} pushed ${count === undefined ? '' : `${plural(count, 'commit')} `}to ${branch(payload.ref)}`
}

const summaries: Record<string, (who: string, payload: Payload) => string | undefined> = {
  PushEvent: pushed,
  PullRequestEvent: (who, payload) => payload.pull_request && `${who} ${pullAction(payload)} ${titled('PR', payload.pull_request)}`,
  PullRequestReviewEvent: (who, { pull_request: pull, review }) => pull && `${who} ${reviewVerb[review?.state ?? ''] ?? 'reviewed'} ${titled('PR', pull)}`,
  PullRequestReviewCommentEvent: (who, { pull_request: pull }) => pull && `${who} commented on the diff of ${titled('PR', pull)}`,
  IssuesEvent: (who, { action, issue }) => issue && `${who} ${action ?? 'updated'} ${titled('issue', issue)}`,
  IssueCommentEvent: (who, { issue }) => issue && `${who} commented on ${titled(issue.pull_request ? 'PR' : 'issue', issue)}`,
  CreateEvent: (who, { ref, ref_type }) => `${who} created ${ref_type ?? 'ref'}${ref ? ` ${ref}` : ''}`,
  DeleteEvent: (who, { ref, ref_type }) => `${who} deleted ${ref_type ?? 'ref'}${ref ? ` ${ref}` : ''}`,
  ReleaseEvent: (who, { action, release }) => `${who} ${action ?? 'published'} release ${release?.name || release?.tag_name || ''}`.trim(),
  ForkEvent: (who, { forkee }) => `${who} forked it${forkee?.full_name ? ` to ${forkee.full_name}` : ''}`,
  WatchEvent: who => `${who} starred it`,
  MemberEvent: (who, { action }) => `${who} ${action ?? 'changed'} a collaborator`,
  PublicEvent: who => `${who} made it public`,
}

const detailOf = ({ commits, pull_request, issue, comment, review, release }: Payload) => {
  const parts = [
    commits?.map(commit => `- ${oneLine(commit.message, 200)}`).join('\n'),
    comment?.body ?? review?.body ?? release?.body ?? pull_request?.body ?? issue?.body,
    pull_request?.html_url ?? issue?.html_url,
  ]
  const text = parts.filter(part => part?.trim()).join('\n\n')
  return text ? clip(text, detailMost) : undefined
}

const eventChange = (repo: string, event: Event): Change => {
  const who = event.actor?.display_login ?? event.actor?.login ?? 'someone'
  const summary = summaries[event.type]?.(who, event.payload) ?? `${who}: ${event.type.replace(/Event$/, '')}`
  const detail = detailOf(event.payload)
  return { at: Date.parse(event.created_at), from: repo, summary: oneLine(summary, 200), ...(detail ? { detail } : {}) }
}

const runKey = (run: Run) => `${run.id}.${run.run_attempt ?? 1}`

const runChange = (repo: string, run: Run): Change => {
  const where = run.head_branch ? ` on ${run.head_branch}` : ''
  const title = run.display_title ? `: ${run.display_title}` : ''
  const by = run.actor?.login ? ` by ${run.actor.login}` : ''
  return {
    at: Date.parse(run.updated_at),
    from: repo,
    summary: oneLine(`${run.name ?? 'Workflow'} ${run.conclusion?.replace('_', ' ') ?? 'failed'}${where}${title}`, 200),
    detail: `${run.html_url}\nRun #${run.run_number}, attempt ${run.run_attempt ?? 1}, started by ${run.event}${by}`,
  }
}

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>(resolve => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })

const follow = (gh: GitHub, repo: string, types: Set<string> | undefined, context: KindContext, signal: AbortSignal, pollMs: number) => {
  const wanted = (type: string) => !types || types.has(normal(type))
  const parsed = seen.safeParse(context.state)
  let known: Seen | undefined = parsed.success ? parsed.data : undefined

  const failedRuns = async () => {
    if (!wanted(runType)) return []
    const { workflow_runs: runs } = await gh.rest<{ workflow_runs: Run[] }>('GET', `/repos/${repo}/actions/runs?status=completed&per_page=50`)
    return runs.filter(run => failed.has(run.conclusion ?? ''))
  }

  const poll = async () => {
    const [events, runs] = await Promise.all([gh.rest<Event[]>('GET', `/repos/${repo}/events?per_page=100`), failedRuns()])
    const newest = events[0]?.id ?? known?.event
    const next: Seen = { event: newest, runs: runs.map(runKey) }
    if (known) {
      const last = known.event
      const reported = new Set(known.runs)
      const fresh = events.filter(event => later(event.id, last) && wanted(event.type)).toReversed()
      for (const event of fresh) context.emit(eventChange(repo, event))
      for (const run of runs.toReversed()) if (!reported.has(runKey(run))) context.emit(runChange(repo, run))
    }
    known = next
    context.save(next)
  }

  const loop = async () => {
    while (!signal.aborted) {
      await poll().catch(error => context.fail(error))
      await pause(pollMs, signal)
    }
  }
  void loop()
}

export const githubKind = (gh: GitHub, pollMs = defaultPollMs): Kind<typeof input> => ({
  name: 'github',
  label: 'GitHub repository',
  description: `New activity on a GitHub repository, such as pushes, pull requests, issues and comments, plus failed CI runs (${runType}). Checks once a minute; the first check only notes where things stand.`,
  input,
  describe: ({ repo, events }) => `${repo}${events?.length ? ` (${events.join(', ')})` : ''} on GitHub`,
  start({ repo, events }, context) {
    const stopped = new AbortController()
    const types = events?.length ? new Set(events.map(normal)) : undefined
    follow(gh, repo, types, context, AbortSignal.any([context.signal, stopped.signal]), pollMs)
    return { stop: () => stopped.abort() }
  },
})
