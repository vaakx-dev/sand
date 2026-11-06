import type { Conversation } from '@sand/engine/contract'
import type { Tool } from '@sand/tools/contract'
import type { Skill } from './contract'
import { z } from 'zod'
import { skillBlock } from './expand'

const input = z.object({ name: z.string().describe('Name of the skill to load') })

const intro = "Load a skill before doing a task it covers. The result includes the skill's folder for any files it references."

export const describeSkills = (list: Skill[]) => `${intro}

Available skills:
${list.map(skill => `- ${skill.name}: ${skill.description}`).join('\n')}`

export const skillTool = (skillsOf: (conversation: Conversation) => Promise<Skill[]>): Tool<typeof input> => ({
  name: 'skill',
  description: intro,
  input,
  effect: 'read',
  async run({ name }, { conversation }) {
    const list = await skillsOf(conversation)
    const skill = list.find(item => item.name === name)
    if (!skill) throw new Error(`Unknown skill "${name}". Available: ${list.map(item => item.name).join(', ')}`)
    return skillBlock(skill).text
  },
})
