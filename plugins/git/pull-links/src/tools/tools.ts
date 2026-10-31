import type { GitHub } from '@sand/github/contract'
import type { Tool, Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { readActivity } from '../activity/read'
import { refOf, type StoredLink } from '../book/record'
import type { Discovery } from '../discover/discovery'
import type { ThreadLinks } from '../links/links'
import { pickInput, pickLink } from './pick'
import { statusText } from './status'

export interface ToolDeps {
  github: GitHub
  links: ThreadLinks
  discovery: Discovery
}

const group = 'pull-requests'

const statusOne = async (deps: ToolDeps, link: StoredLink) => {
  const ref = refOf(link)
  const [summary, activity] = await Promise.all([deps.github.summary(ref, true), readActivity(deps.github, ref)])
  return statusText(link, summary, activity)
}

const statusTool = (deps: ToolDeps): Tool<typeof pickInput> => ({
  name: 'pull_request_status',
  group,
  description:
    "Show the thread's linked GitHub pull requests: state, checks with the names of failing ones, review, merge state, whether you're watching, and open review conversations. Leave out number to see them all.",
  input: pickInput,
  async run({ number }, { session }) {
    const thread = deps.links.thread(session.id)
    if (!deps.links.read(thread.id).links.length) await deps.discovery.now(thread)
    const links = deps.links.read(thread.id)
    const chosen = number === undefined ? links.links : [pickLink(links, number)]
    if (!chosen.length) return "This thread has no linked pull requests, and its branch doesn't have one open. Link one with link_pull_request."
    return (await Promise.all(chosen.map(link => statusOne(deps, link)))).join('\n\n---\n\n')
  },
})

const linkInput = z.object({ ref: z.string().min(1).describe('A pull request URL, or #number for this repository') })

const linkTool = (deps: ToolDeps): Tool<typeof linkInput> => ({
  name: 'link_pull_request',
  group,
  description: 'Link a GitHub pull request to this thread so it shows in the thread and pull_request_status covers it. Pull requests for the thread\'s branch, ones you open with gh pr create and the rest of their stack are linked on their own.',
  input: linkInput,
  async run({ ref }, { session }) {
    const pulls = await deps.links.linkText(session.id, ref)
    return `Linked. This thread now has ${pulls.links.map(link => `#${link.number}`).join(', ')}.`
  },
})

const linkedText = (numbers: number[]) => (numbers.length ? `This thread still has ${numbers.map(number => `#${number}`).join(', ')}.` : 'This thread has no linked pull requests now.')

const unlinkTool = (deps: ToolDeps): Tool<typeof pickInput> => ({
  name: 'unlink_pull_request',
  group,
  description: "Unlink a pull request from this thread. It stays unlinked: the thread's branch and its stack won't link it again.",
  input: pickInput,
  async run({ number }, { session }) {
    const thread = deps.links.thread(session.id)
    const link = pickLink(deps.links.read(thread.id), number)
    const pulls = await deps.links.unlink(thread.id, link)
    return `Unlinked #${link.number}. ${linkedText(pulls.links.map(each => each.number))}`
  },
})

const watchTool = (deps: ToolDeps, on: boolean): Tool<typeof pickInput> => ({
  name: on ? 'watch_pull_request' : 'unwatch_pull_request',
  group,
  description: on
    ? 'Watch a linked pull request. You get a message in this thread when its checks fail or pass, a review or comment arrives, or the branch starts to conflict. Watching stops when it merges or closes.'
    : 'Stop watching a linked pull request. Do this when you hand the pull request back.',
  input: pickInput,
  async run({ number }, { session }) {
    const thread = deps.links.thread(session.id)
    const link = pickLink(deps.links.read(thread.id), number)
    await deps.links.watch(thread.id, link, on)
    return on
      ? `Watching #${link.number}. You'll get a message here when its checks finish, a review or comment arrives, or it starts to conflict.`
      : `Stopped watching #${link.number}.`
  },
})

export const pullTools = (tools: Tools, deps: ToolDeps) =>
  joinDisposers(
    tools.group({ name: group, label: 'Pull requests', summary: "check, link, unlink and watch the thread's GitHub pull requests", load: 'on-demand' }),
    tools.register(statusTool(deps)),
    tools.register(linkTool(deps)),
    tools.register(unlinkTool(deps)),
    tools.register(watchTool(deps, true)),
    tools.register(watchTool(deps, false)),
  )
