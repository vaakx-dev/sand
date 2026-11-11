import { combinations } from './boot'

combinations([
  ['the kernel alone', [], [], []],
  ['Threads alone', ['threads'], [], ['sessions', 'engine', 'llm', 'tools', 'gitRepo', 'gitRunner', 'htmlPages']],
  ['Threads without git', ['threads'], ['git'], ['sessions', 'engine', 'llm', 'tools', 'htmlPages']],
])
