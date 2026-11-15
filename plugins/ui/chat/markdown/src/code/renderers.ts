import type { Dispose } from 'drydock'
import type { CodeRenderer, MarkdownCode } from '../contract'

export type FindCode = (language: string) => CodeRenderer | undefined

type Follower = () => Dispose

export const codeRenderers = () => {
  let registered: CodeRenderer[] = []
  const followers = new Map<Follower, Dispose>()

  const changed = (next: CodeRenderer[]) => {
    registered = next
    for (const [follower, stop] of followers) {
      stop()
      followers.set(follower, follower())
    }
  }

  const language: MarkdownCode['language'] = renderer => {
    changed([renderer, ...registered])
    return () => changed(registered.filter(other => other !== renderer))
  }

  const find: FindCode = name => registered.find(renderer => renderer.language === name.toLowerCase())

  const follow = (follower: Follower): Dispose => {
    followers.set(follower, follower())
    return () => {
      followers.get(follower)?.()
      followers.delete(follower)
    }
  }

  return { language, find, follow }
}
