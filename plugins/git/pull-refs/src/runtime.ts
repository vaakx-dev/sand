import { contextKinds, type ContextKind } from '@sand/context/contract'
import { definePlugin } from 'drydock'
import { pullKind, pullOf, pullUrl } from './pull'

const pull: ContextKind = {
  kind: pullKind,
  title: 'Pull request',
  project(record) {
    const found = pullOf(record)
    if (!found) return { unavailable: 'The link holds no readable pull request.' }
    return { body: `Pull request ${found.repo}#${found.number}: ${found.title}\nState: ${found.state}\nURL: ${pullUrl(found)}` }
  },
}

export default definePlugin({
  name: 'pull-refs',
  description: 'Gives the model the pull requests a message links: number, title, state and link, as they were when linked',
  apply(ctx) {
    ctx.watch(contextKinds, found => found?.register(pull))
  },
})
