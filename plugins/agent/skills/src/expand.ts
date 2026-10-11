import type { TextBlock, UserContent } from '@sand/messages'
import type { Skill, Skills } from './contract'
import type { Context } from 'drydock'

const mention = /(?:^|[\s(])\$([a-zA-Z0-9][\w.-]*)/g

export const skillBlock = (skill: Skill): TextBlock => ({
  type: 'text',
  text: `<skill name="${skill.name}" dir="${skill.dir}">\n${skill.body}\n</skill>`,
})

const mentions = (content: UserContent[]) =>
  new Set(content.flatMap(block => (block.type === 'text' ? [...block.text.matchAll(mention)].map(match => match[1]!) : [])))

export const expandMentions = (ctx: Context, skills: Skills) =>
  ctx.on('turn.prompt', async (content, session) => {
    const names = [...mentions(content)]
    if (!names.length) return content
    const list = await skills.list(session.cwd, session.project)
    const mentioned = names.flatMap(name => list.find(skill => skill.name === name) ?? [])
    return mentioned.length ? [...mentioned.map(skillBlock), ...content] : content
  })
