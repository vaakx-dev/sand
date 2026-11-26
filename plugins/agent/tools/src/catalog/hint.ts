import { findName, type Hint } from '../contract'

interface Pending extends Hint {
  groups: string[]
}

const listed = (names: string[]) => (names.length === 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

const hintText = ({ tools, groups, purpose }: Pending) => `Load ${listed(tools)} with ${listed(groups.map(group => `${findName}("${group}")`))} ${purpose}.`

export { hintText }
