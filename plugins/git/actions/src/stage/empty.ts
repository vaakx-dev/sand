import { failure } from '../run/failure'

export const nothingToCommit = () => failure('unknown', "There's nothing to commit.")

export const noFilesPicked = () => failure('unknown', 'Pick at least one file to commit.')
