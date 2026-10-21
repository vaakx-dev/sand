import { isWithin } from '@sand/util/fs'
import type { OrrinPlace, OrrinProject, OrrinView } from './contract'

const userView = (views: OrrinView[], project: OrrinProject) =>
  views.find(view => view.project === project.id && view.kind === 'user' && view.state === 'open')

export const joinPlaces = (projects: OrrinProject[], views: OrrinView[]): OrrinPlace[] =>
  projects.flatMap(project => {
    const view = userView(views, project)
    return view ? [{ project, view }] : []
  })

export const placeAt = (places: OrrinPlace[], path: string) =>
  places
    .filter(place => isWithin(path, place.view.path))
    .sort((a, b) => b.view.path.length - a.view.path.length)[0]
