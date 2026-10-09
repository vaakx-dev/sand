import type { Skill, Skills, Tool } from '@sand/protocol'
import { z } from 'zod'
import { skillBlock } from './expand'

const input = z.object({ name: z.string().describe('Name of the skill to load') })

export const describeSkills = (list: Skill[]) => `Load a skill's instructions before doing a task it covers. Skills are packaged instructions for specific kinds of work; the result includes the skill's folder so you can read any files it references.

Available skills:
${list.map(skill => `- ${skill.name}: ${skill.description}`).join('\n')}`

export const skillTool = (skills: Skills, global: Skill[]): Tool<typeof input> => ({
  name: 'skill',
  description: describeSkills(global),
  input,
  async run({ name }, { cwd, session }) {
    const skill = await skills.get(name, cwd, session.project)
    if (!skill) throw new Error(`Unknown skill "${name}". Available: ${(await skills.list(cwd, session.project)).map(item => item.name).join(', ')}`)
    return skillBlock(skill).text
  },
})
