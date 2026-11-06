import type { SkillSummary } from '@sand/skills/contract'
import type { Trigger, TriggerItem } from '../contract'

export const skillTrigger = (list: () => SkillSummary[] | Promise<SkillSummary[]>): Trigger => ({
  char: '$',
  label: 'skills',
  items: async query =>
    (await list())
      .filter(skill => skill.name.toLowerCase().includes(query.toLowerCase()))
      .map((skill): TriggerItem => ({ label: skill.name, description: skill.description })),
  accept: item => `$${item.label} `,
})
