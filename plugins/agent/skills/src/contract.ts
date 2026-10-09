import type { Dispose } from 'drydock'

export interface Skill {
  name: string
  description: string
  dir: string
  body: string
}

export type SkillSummary = Pick<Skill, 'name' | 'description'>

export interface Skills {
  list(cwd?: string, project?: string | null): Promise<Skill[]>
  get(name: string, cwd?: string, project?: string | null): Promise<Skill | undefined>
  register(dir: string, values?: Record<string, string>): Dispose
}

declare module 'drydock' {
  interface Services {
    skills: Skills
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'skills.list': { session?: string; cwd?: string }
  }

  interface WireEvents {
    'skills.change': []
  }

  interface HelloFields {
    skills: SkillSummary[]
  }
}
