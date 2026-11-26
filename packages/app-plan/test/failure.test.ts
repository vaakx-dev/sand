import { ProviderTrouble, UsageLimited } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { appFailure, type Failure } from '../src'

const weekSpent = { windows: [{ id: 'weekly', label: 'Weekly', used: 1, resetsAt: 1_900_000_000_000 }] }
const weekHalf = { windows: [{ id: 'weekly', label: 'Weekly', used: 0.5, resetsAt: 1_900_000_000_000 }] }

test('an app turn fails as out of usage only when the app or its limits say the plan is spent', () => {
  expect(appFailure({ message: 'Out of usage', limited: { resetsAt: 1_800_000_000_000 } })).toMatchObject({ name: 'UsageLimited', resetsAt: 1_800_000_000_000 })
  expect(appFailure({ message: 'Too many requests', status: 429, limits: weekSpent })).toMatchObject({ name: 'UsageLimited', resetsAt: 1_900_000_000_000 })
  expect(appFailure({ message: 'Too many requests', status: 429, limits: weekHalf })).not.toBeInstanceOf(UsageLimited)
})

test('a busy, rate-limited or dropped app turn is provider trouble that sand retries, and a refused one is not', () => {
  const retried: Failure[] = [
    { message: 'Too many requests', status: 429 },
    { message: 'Overloaded', status: 529 },
    { message: 'Stream disconnected', status: 'dropped' },
    { message: 'API Error: Connection error.' },
    { message: 'read ECONNRESET' },
  ]
  expect(retried.map(appFailure).every(error => error instanceof ProviderTrouble)).toBe(true)
  expect(appFailure({ message: 'Bad request', status: 400 })).not.toBeInstanceOf(ProviderTrouble)
  expect(appFailure({ message: 'The model refused' })).not.toBeInstanceOf(ProviderTrouble)
})
