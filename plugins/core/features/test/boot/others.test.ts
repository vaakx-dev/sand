import { combinations } from './boot'

combinations([
  ['Calendar alone', ['calendar'], [], ['calendars']],
  ['Computer use alone', ['computers'], [], ['computers', 'engine', 'llm', 'tools']],
  ['Calendar with its accounts', ['calendar', 'connections'], [], ['calendars', 'connections']],
  ['Several PCs alone', ['phone', 'pcs'], [], []],
  ['Phone alone', ['phone'], [], []],
  ['Notifications alone', ['notifications'], [], []],
  ['Outside access alone', ['outside'], [], []],
  ['Updates alone', ['updates'], [], []],
])
