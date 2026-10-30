import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { service, type Dispose } from 'drydock'
import { z } from 'zod'

export interface Skill {
  name: string
  description: string
  dir: string
  body: string
}

export type SkillSummary = Pick<Skill, 'name' | 'description'>

export interface Skills {
  list(cwd?: string, project?: string | null): Promise<Skill[]>
  register(dir: string, values?: Record<string, string>): Dispose
}

export const skills = service<Skills>('skills')

export const skillsChange = wireEvent<void>('skills.change')

export const helloSkills = helloField<SkillSummary[]>('skills')

export const skillsList = request('skills.list', {
  input: z.object({ session: z.string().optional(), cwd: z.string().optional() }),
  output: type<SkillSummary[]>(),
  place: 'thread',
})
