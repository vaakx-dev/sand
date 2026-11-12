import type { ToolSpec } from './llm'

export const loadedTools = (tools: ToolSpec[]) => tools.filter(tool => !tool.deferred || tool.deferred.found)
