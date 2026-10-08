import type { RenderEntry, RenderTool, ToolRenderer } from '@sand/protocol'
import { sig, type Sig } from '@sand/dom'
import type { Dispose } from 'drydock'
import { resolveRenderer } from '../tools/resolve'

export interface RendererRegistry {
  readonly version: Sig<number>
  tool(name: string, render: RenderTool | ToolRenderer): Dispose
  entry(type: string, render: RenderEntry): Dispose
  toolRenderer(name: string): Required<ToolRenderer>
  entryRenderer(type: string): RenderEntry | undefined
}

export const rendererRegistry = (changed: () => void = () => {}): RendererRegistry => {
  const tools = new Map<string, RenderTool | ToolRenderer>()
  const entries = new Map<string, RenderEntry>()
  const resolved = new Map<string, Required<ToolRenderer>>()
  const version = sig(0)

  const bump = () => {
    resolved.clear()
    version.update(value => value + 1)
    changed()
  }

  const add = <T>(map: Map<string, T>, key: string, value: T): Dispose => {
    map.set(key, value)
    bump()
    return () => {
      if (map.get(key) === value) map.delete(key)
      bump()
    }
  }

  const toolRenderer = (name: string) => {
    const found = resolved.get(name) ?? resolveRenderer(name, tools.get(name))
    resolved.set(name, found)
    return found
  }

  return {
    version,
    tool: (name, render) => add(tools, name, render),
    entry: (type, render) => add(entries, type, render),
    toolRenderer,
    entryRenderer: type => entries.get(type),
  }
}
