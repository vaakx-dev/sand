import type { Conversation } from '@sand/engine/contract'
import { briefTools } from '@sand/provider-threads/contract'
import type { Skill } from './contract'
import type { Context } from 'drydock'
import { describeSkills } from './tool'

export const describeForConversation = (ctx: Context, skillsOf: (conversation: Conversation) => Promise<Skill[]>) =>
  ctx.on(briefTools, async (tools, conversation) => {
    const list = await skillsOf(conversation)
    return list.length
      ? tools.map(spec => (spec.name === 'skill' ? { ...spec, description: describeSkills(list) } : spec))
      : tools.filter(spec => spec.name !== 'skill')
  })
