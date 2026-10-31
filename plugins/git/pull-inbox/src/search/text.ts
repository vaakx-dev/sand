const meQualifiers = new Set(['author', 'assignee', 'mentions', 'commenter', 'involves', 'review-requested', 'reviewed-by', 'user-review-requested'])

const checkStates: Record<string, string> = {
  pass: 'success',
  passing: 'success',
  success: 'success',
  fail: 'failure',
  failing: 'failure',
  failure: 'failure',
  pending: 'pending',
  running: 'pending',
}

const translate = (token: string) => {
  const negated = token.startsWith('-') ? '-' : ''
  const body = negated ? token.slice(1) : token
  const split = body.indexOf(':')
  if (split < 1) return token
  const key = body.slice(0, split).toLowerCase()
  const value = body.slice(split + 1)
  if (value.toLowerCase() === 'me' && meQualifiers.has(key)) return `${negated}${key}:@me`
  const checks = key === 'checks' ? checkStates[value.toLowerCase()] : undefined
  if (checks) return `${negated}status:${checks}`
  if (key === 'is' && value.toLowerCase() === 'draft') return `${negated}draft:true`
  return token
}

export const searchText = (text = '') => text.trim().split(/\s+/).filter(Boolean).map(translate).join(' ')
