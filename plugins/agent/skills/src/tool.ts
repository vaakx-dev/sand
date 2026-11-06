import type { Tool } from '@sand/tools/contract'
import type { Skill, Skills } from './contract'
import { z } from 'zod'
import { skillBlock } from './expand'

const input = z.object({ name: z.string().describe('Name of the skill to load') })

export const describeSkills = (list: Skill[]) => `Load a skill before doing a task it covers. The result includes the skill's folder for any files it references.

Available skills:
${list.map(skill => `- ${skill.name}: ${skill.description}`).join('\n')}`

export const skillTool = (skills: Skills, global: Skill[], threadProject: (id: string) => string | null): Tool<typeof input> => ({
  name: 'skill',
  description: describeSkills(global),
  input,
  effect: 'read',
  async run({ name }, { cwd, conversation }) {
    const project = conversation.owner === 'thread' ? threadProject(conversation.id) : null
    const list = await skills.list(cwd, project)
    const skill = list.find(item => item.name === name)
    if (!skill) throw new Error(`Unknown skill "${name}". Available: ${list.map(item => item.name).join(', ')}`)
    return skillBlock(skill).text
  },
})
