import type { Markdown, NodeOptions } from '@sand/markdown/contract'
import { collectScope, disposeAll, scoped, type Disposer } from '@vaakx-dev/vrui'
import { morph } from './morph'

interface Build {
  adopted: Node[]
  scope: Disposer[]
}

export const streamedMarkdown = (node: Node, markdown: Markdown, options: NodeOptions) => {
  let prefix = ''
  let count = 0
  let builds: Build[] = []

  const shown = (build: Build) => build.adopted.some(adopted => node.contains(adopted))

  const place = (nodes: Node[], scope: Disposer[], offset: number) => {
    builds.push({ adopted: morph(node, nodes, offset), scope })
    const hidden = new Set(builds.filter(build => !shown(build)))
    builds = builds.filter(build => !hidden.has(build))
    disposeAll([...hidden].flatMap(build => build.scope))
  }

  const whole = (source: string) => {
    prefix = ''
    count = 0
    const { value, scope } = collectScope(() => markdown.nodes(source, options))
    place(value, scope, 0)
  }

  scoped(() => disposeAll(builds.flatMap(build => build.scope)))

  return (source: string, streaming: boolean) => {
    if (!streaming || !source.startsWith(prefix)) return whole(source)
    const { value: next, scope } = collectScope(() => markdown.settle(source.slice(prefix.length), options))
    if (!next) {
      disposeAll(scope)
      return whole(source)
    }
    place([...next.settled, ...next.open], scope, count)
    count += next.settled.length
    prefix = source.slice(0, prefix.length + next.length)
  }
}
