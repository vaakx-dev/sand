import { expect, test } from 'bun:test'
import { div } from '@vaakx-dev/vrui'
import { pageStore } from '../src/pages'

const render = () => div()

test('search finds settings by label or keyword, names their page, and puts label matches first', () => {
  const store = pageStore()
  store.add({ id: 'look', label: 'Look', render, items: [{ id: 'scene', label: 'Scene', keywords: ['background', 'dark sky'] }] })
  store.add({ id: 'darkroom', label: 'Darkroom', render })
  store.addSection({ page: 'look', id: 'extra', render, items: [{ id: 'motion', label: 'Motion', keywords: ['animation'] }] })

  const found = (query: string) => store.search(query).map(({ label, place, item }) => ({ label, place, item }))

  expect(found('dark')).toEqual([
    { label: 'Darkroom', place: undefined, item: undefined },
    { label: 'Scene', place: 'Look', item: 'scene' },
  ])
  expect(found('ANIMATION')).toEqual([{ label: 'Motion', place: 'Look', item: 'motion' }])
  expect(found('sky background')).toEqual([{ label: 'Scene', place: 'Look', item: 'scene' }])
})
