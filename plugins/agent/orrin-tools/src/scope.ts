import type { Attachments } from '@sand/attachments/contract'
import type { Orrin } from '@sand/orrin/contract'
import type { Tool, ToolContext, ToolOutput } from '@sand/tools/contract'
import { isWithin } from '@sand/util/fs'
import { relative, resolve, sep } from 'node:path'
import type { output, ZodType } from 'zod'
import type { ChatViews } from './views'

export interface Scope {
  orrin: Orrin
  attachments: Attachments
  project: string
  view: string
  projectPath(path: string): string | undefined
  diskPath(path: string): string
}

interface OrrinToolSpec<S extends ZodType> {
  name: string
  description: string
  input: S
  replaces?: string[]
  environment?: string
  run(input: output<S>, scope: Scope, context: ToolContext): ToolOutput | Promise<ToolOutput>
}

const scopeOf = async (orrin: Orrin, attachments: Attachments, views: ChatViews, { session, cwd }: ToolContext): Promise<Scope> => {
  const view = await views.of(session)
  if (!view) throw new Error('This chat is not in an Orrin project')
  const diskPath = (path: string) => resolve(cwd, path)
  const projectPath = (path: string) => {
    const full = diskPath(path)
    return isWithin(full, view.root) ? relative(view.root, full).split(sep).join('/') : undefined
  }
  return { orrin, attachments, project: view.place.project.id, view: view.id, projectPath, diskPath }
}

export const orrinTool =
  (orrin: Orrin, attachments: Attachments, views: ChatViews) =>
  <S extends ZodType>(spec: OrrinToolSpec<S>): Tool<S> => ({
    name: spec.name,
    description: spec.description,
    input: spec.input,
    ...(spec.replaces ? { replaces: spec.replaces } : {}),
    ...(spec.environment ? { environment: spec.environment } : {}),
    active: session => orrin.placeAt(session.cwd) !== undefined,
    run: async (input, context) => spec.run(input, await scopeOf(orrin, attachments, views, context), context),
  })

export type MakeTool = ReturnType<typeof orrinTool>
