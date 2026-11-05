import type { SkillIndex } from '@sand/web-client/contract'
import type { Trigger, TriggerItem } from '../contract'

export const skillTrigger = (index: SkillIndex): Trigger => ({
  char: '$',
  label: 'skills',
  items: query =>
    index
      .list()
      .filter(skill => skill.name.toLowerCase().includes(query.toLowerCase()))
      .map((skill): TriggerItem => ({ label: skill.name, description: skill.description })),
  accept: item => `$${item.label} `,
})
