import { event, service } from 'drydock'
import type { FileIndex, LimitsFeed, Models, SkillIndex } from './data'
import type { Projects } from './projects'
import type { Threads } from './threads'
import type { Turns } from './turns'

export type * from './data'
export type * from './projects'
export type * from './threads'
export type * from './turns'

export const threads = service<Threads>('threads')
export const turns = service<Turns>('turns')
export const models = service<Models>('models')
export const limits = service<LimitsFeed>('limits')
export const fileIndex = service<FileIndex>('fileIndex')
export const skillIndex = service<SkillIndex>('skillIndex')
export const projects = service<Projects>('projects')

export const threadsChange = event<() => void>('threads.change')
export const threadChange = event<(id: string) => void>('thread.change')
export const threadSelect = event<(id: string | undefined) => void>('thread.select')
export const modelsChange = event<() => void>('models.change')
export const limitsChange = event<() => void>('limits.change')
export const skillsChange = event<() => void>('skills.change')
export const projectsChange = event<() => void>('projects.change')
