import { contextKinds, type ContextKind } from '@sand/context/contract'
import { definePlugin } from 'drydock'
import { pullKind, pullOf } from './pull'

const pull: ContextKind = {
  kind: pullKind,
  title: 'Pull request',
  project(record) {
    const found = pullOf(record)
    return found && `Pull request ${found.repo}#${found.number}: ${found.title}\nState: ${found.state}\nURL: ${found.url}`
  },
}

export default definePlugin({
  name: 'pull-refs',
  description: 'Gives the model the pull requests a message links: number, title, state and link, as they were when linked',
  apply(ctx) {
    ctx.watch(contextKinds, found => found?.register(pull))
  },
})
