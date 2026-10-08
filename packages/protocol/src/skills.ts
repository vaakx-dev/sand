import type { Dispose } from 'drydock'

export interface Skill {
  name: string
  description: string
  dir: string
  body: string
}

export type SkillSummary = Pick<Skill, 'name' | 'description'>

export interface Skills {
  list(): Skill[]
  get(name: string): Skill | undefined
  register(dir: string, values?: Record<string, string>): Dispose
}
