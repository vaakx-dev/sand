import { type GitHubClient, type PullRef, pullLabel } from '@sand/github/contract'
import { pullName } from '@sand/github/look'
import type { Toasts } from '@sand/toasts/contract'
import type { Threads, Turns } from '@sand/web-client/contract'
import type { AgentPrompt, LinkedThread, PullOpenRequest, ThreadPlace } from '../contract'

const toastId = 'pull-links'

interface AskParts {
  toasts: Toasts
  turns: Turns
  threads: Threads
  github: GitHubClient
  threadsOf(pull: PullRef): LinkedThread[]
  open(input: PullOpenRequest, device: string): Promise<{ session: string }>
}

export const pullAgent = ({ toasts, turns, threads, github, threadsOf, open }: AskParts) => {
  const send = async ({ session }: ThreadPlace, prompt: AgentPrompt) => {
    const sent = await toasts.attempt(toastId, "Couldn't send to the agent", () => turns.send(session, prompt.text, prompt.label).then(() => true))
    if (!sent) return false
    toasts.show({ id: toastId, tone: 'success', title: 'Sent to the agent', actions: [{ label: 'Show thread', run: () => threads.select(session) }] })
    return true
  }

  const openThread = async (pull: PullRef, select = true): Promise<LinkedThread | undefined> => {
    const title = `Couldn't open ${pullName(pull)}`
    const at = github.localCopy(pull.repo)
    if (!at) {
      toasts.error(toastId, title, `No project on an online PC has ${pull.repo} as its remote.`)
      return undefined
    }
    const progress = toasts.show({ tone: 'neutral', sticky: true, title: `Opening ${pullName(pull)} in a worktree…` })
    const opened = await toasts.attempt(toastId, title, () => open({ cwd: at.cwd, ref: pullLabel(pull), mode: 'worktree' }, at.device).finally(() => progress.dismiss()))
    if (!opened) return undefined
    if (select) await threads.select(opened.session)
    return { session: opened.session, device: at.device, watching: false }
  }

  const offer = (pull: PullRef, prompt: AgentPrompt) => {
    const title = `No thread works on ${pullName(pull)} yet`
    if (!github.localCopy(pull.repo)) return toasts.error(toastId, title, `Add a project with ${pull.repo} as its remote, then open the pull request in a thread.`)
    toasts.show({
      id: toastId,
      tone: 'neutral',
      sticky: true,
      title,
      detail: 'Open it in a thread and the agent gets this there.',
      actions: [
        {
          label: 'Open in a thread',
          primary: true,
          run: async () => {
            const thread = await openThread(pull, false)
            if (thread) await send(thread, prompt)
          },
        },
      ],
    })
  }

  const ask = async (pull: PullRef, prompt: AgentPrompt, place?: ThreadPlace) => {
    const thread = place ?? threadsOf(pull)[0]
    if (thread) return send(thread, prompt)
    offer(pull, prompt)
    return false
  }

  return { openThread, ask }
}
