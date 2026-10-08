import type { Skills, Tool } from '@sand/protocol'
import { z } from 'zod'
import { skillBlock } from './expand'

const input = z.object({ name: z.string().describe('Name of the skill to load') })

export const skillTool = (skills: Skills): Tool<typeof input> => ({
  name: 'skill',
  description: `Load a skill's instructions before doing a task it covers. Skills are packaged instructions for specific kinds of work; the result includes the skill's folder so you can read any files it references.

Available skills:
${skills
  .list()
  .map(skill => `- ${skill.name}: ${skill.description}`)
  .join('\n')}`,
  input,
  run({ name }) {
    const skill = skills.get(name)
    if (!skill) throw new Error(`Unknown skill "${name}". Available: ${skills.list().map(item => item.name).join(', ')}`)
    return skillBlock(skill).text
  },
})
