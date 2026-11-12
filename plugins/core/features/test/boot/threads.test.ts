import { combinations } from './boot'

combinations([
  ['the kernel alone', [], [], []],
  ['Threads alone', ['threads'], [], ['sessions', 'engine', 'llm', 'tools', 'schedules', 'htmlPages']],
  ['Threads with coding', ['threads', 'git'], [], ['sessions', 'engine', 'llm', 'tools', 'schedules', 'gitRepo', 'gitRunner', 'htmlPages']],
])
