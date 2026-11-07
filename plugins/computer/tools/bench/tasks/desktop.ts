import { all, onScreen, type Task } from './task'

export const desktop: Task[] = [
  {
    id: 'steam-game',
    set: 'desktop',
    place: 'app',
    prompt: () => 'Open the Steam app (not a web browser) and find the store page of the game Portal 2. Do not buy, install or add anything.',
    check: seen => seen.judge('The Steam desktop app, not a web browser, shows the store page of the game Portal 2.'),
  },
  {
    id: 'calculator',
    set: 'desktop',
    place: 'app',
    prompt: () => 'Open the Windows Calculator app and use it to work out 1234 × 56, so the result shows in Calculator.',
    check: seen => onScreen(seen, 'Display is 69,104', 'Display is 69104'),
  },
  {
    id: 'explorer-folder',
    set: 'desktop',
    place: 'app',
    prompt: () => 'Open File Explorer and show the contents of the folder C:\\Windows\\System32\\drivers\\etc. Do not open, move or change any file.',
    check: seen => all(onScreen(seen, 'hosts'), onScreen(seen, 'networks')),
  },
  {
    id: 'settings-about',
    set: 'desktop',
    place: 'app',
    prompt: () => 'Open Windows Settings and go to the System > About page. Do not change anything.',
    check: seen => onScreen(seen, 'Device specifications'),
  },
]
