import { Prec } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { cross, removeBeside } from './commands'

export const quoteKeys = Prec.high(
  keymap.of([
    { key: 'Backspace', run: removeBeside('to') },
    { key: 'Delete', run: removeBeside('from') },
    { key: 'ArrowUp', run: cross(false) },
    { key: 'ArrowDown', run: cross(true) },
  ]),
)
