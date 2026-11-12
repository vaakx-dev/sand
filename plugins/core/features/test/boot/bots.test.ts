import { combinations } from './boot'

combinations([
  ['Bots alone', ['bots'], [], ['bots', 'engine', 'llm', 'tools', 'schedules', 'htmlPages']],
  ['Bots without HTML pages', ['bots'], ['html'], ['bots', 'engine', 'llm', 'tools', 'schedules']],
  ['Bots without notifications or schedules', ['bots'], ['notifications', 'schedules'], ['bots', 'engine', 'llm', 'tools', 'htmlPages']],
])
