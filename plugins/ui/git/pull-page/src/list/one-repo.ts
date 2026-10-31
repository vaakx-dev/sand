const repoQualifier = /(?:^|\s)repo:\S+/g

export const isOneRepo = (repos: string[] | undefined, q: string | undefined) => repos?.length === 1 || (q?.match(repoQualifier)?.length ?? 0) === 1
