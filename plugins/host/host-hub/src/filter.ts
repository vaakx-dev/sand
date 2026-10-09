const currentOnly = new Set([
  'ui.relay',
  'web.build',
  'web.extensions',
  'skills.change',
  'models.change',
])

export const passes = (name: string, current: boolean) => current || !currentOnly.has(name)
