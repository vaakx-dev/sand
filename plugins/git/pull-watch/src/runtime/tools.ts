import type { Tool, Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import type { Follows } from './follows'

const GROUP = 'github'

const input = z.object({ pull: z.string().trim().min(1).describe('The pull request, as its URL or owner/name#number') })

const listed = (follows: Follows, thread: string) => {
  const pulls = follows.list(thread)
  if (!pulls.length) return 'This chat follows no pull requests now.'
  return `This chat follows: ${pulls.map(pull => `${pull.repo}#${pull.number}`).join(', ')}.`
}

const followTool = (follows: Follows): Tool<typeof input> => ({
  name: 'pr_follow',
  description:
    "Get a turn in this chat when a pull request's CI finishes, a review or comment lands, or it closes or conflicts. The chat is archived once every PR it follows has merged. A chat already follows the PRs it opens; use this for others.",
  input,
  effect: 'read',
  needs: ['thread'],
  group: GROUP,
  async run({ pull }, { conversation }) {
    const followed = await follows.followText(conversation.id, pull)
    return `Following ${followed.repo}#${followed.number}. ${listed(follows, conversation.id)}`
  },
})

const unfollowTool = (follows: Follows): Tool<typeof input> => ({
  name: 'pr_unfollow',
  description: 'Stop following a pull request from this chat.',
  input,
  effect: 'read',
  needs: ['thread'],
  group: GROUP,
  run({ pull }, { conversation }) {
    const removed = follows.unfollow(conversation.id, pull)
    return `${removed ? 'Stopped following it.' : "This chat wasn't following it."} ${listed(follows, conversation.id)}`
  },
})

export const registerTools = (tools: Tools, follows: Follows) => joinDisposers(tools.register(followTool(follows)), tools.register(unfollowTool(follows)))
