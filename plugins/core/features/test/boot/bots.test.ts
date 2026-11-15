import { combinations } from './boot'

combinations([
  ['Bots without threads', ['bots'], [], []],
  ['Threads and bots', ['threads', 'bots'], [], ['sessions', 'bots', 'engine', 'llm', 'tools', 'schedules', 'htmlPages']],
  ['Threads and bots without notifications or schedules', ['threads', 'bots'], ['notifications', 'schedules'], ['sessions', 'bots', 'engine', 'llm', 'tools', 'htmlPages']],
])
