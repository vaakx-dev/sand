import { request, type } from '@sand/host-hub/contract'
import { type CreatedProject, createInput, type ProjectRow, type RemovedProject, removeInput, rootInput, updateInput } from '@sand/project/contract'
import { z } from 'zod'

const callers = 'any'
const pc = z.string().min(1).optional()

export const projectRows = request('project.rows', { input: z.object({}), output: type<ProjectRow[]>(), callers })
export const projectCreate = request('project.create', { input: createInput.extend({ pc }), output: type<CreatedProject>(), callers })
export const projectUpdate = request('project.update', { input: updateInput, output: type<ProjectRow>(), callers })
export const projectRemove = request('project.remove', { input: removeInput, output: type<ProjectRow | RemovedProject>(), callers })
export const projectRoot = request('project.root', { input: rootInput.extend({ pc }), output: type<{ root: string }>(), callers })
