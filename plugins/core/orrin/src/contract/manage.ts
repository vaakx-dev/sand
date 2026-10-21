import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'
import type { OrrinView } from './model'

export interface OrrinWorker {
  id: string
  owner: string
  state: OrrinView['state']
  createdAt: number
}

export interface OrrinManagedProject {
  id: string
  name: string
  folder?: string
  homePc: string
  homeHere: boolean
  main: string
  workers: OrrinWorker[]
  changedAt?: number
}

export interface OrrinProjects {
  running: boolean
  projects: OrrinManagedProject[]
}

export const orrinProjectsGet = request('orrin.projects.get', { input: z.object({}), output: type<OrrinProjects>() })
export const orrinProjectUnlanded = request('orrin.project.unlanded', {
  input: z.object({ project: z.string() }),
  output: type<{ files: number }>(),
})
export const orrinProjectRemove = request('orrin.project.remove', {
  input: z.object({ project: z.string(), deleteFolder: z.boolean().optional() }),
  output: type<OrrinProjects>(),
})
export const orrinViewDrop = request('orrin.view.drop', { input: z.object({ view: z.string() }), output: type<OrrinProjects>() })

export const orrinProjectsChange = wireEvent<OrrinProjects>('orrin.projects.change')
