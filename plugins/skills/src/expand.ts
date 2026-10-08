import type { Skill, TextBlock, UserContent } from '@sand/protocol'

const mention = /(?:^|[\s(])\$([a-zA-Z0-9][\w.-]*)/g

export const skillBlock = (skill: Skill): TextBlock => ({
  type: 'text',
  text: `<skill name="${skill.name}" dir="${skill.dir}">\n${skill.body}\n</skill>`,
})

export const mentions = (content: UserContent[]) =>
  new Set(content.flatMap(block => (block.type === 'text' ? [...block.text.matchAll(mention)].map(match => match[1]!) : [])))

export const expand = (content: UserContent[], skills: Skill[]): UserContent[] =>
  skills.length ? [...skills.map(skillBlock), ...content] : content
