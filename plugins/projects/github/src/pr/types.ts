export interface Check {
  __typename: 'CheckRun' | 'StatusContext'
  name?: string
  context?: string
  status?: string
  conclusion?: string
  state?: string
  detailsUrl?: string
  targetUrl?: string
}

export interface Comment {
  author: { login: string } | null
  body: string
  createdAt: string
}

export interface Review {
  author: { login: string } | null
  body: string
  state: string
  submittedAt: string
}

export interface PrView {
  number: number
  title: string
  url: string
  state: string
  isDraft: boolean
  headRefName: string
  baseRefName: string
  headRefOid: string
  mergeStateStatus: string
  reviewDecision: string
  statusCheckRollup: Check[]
  commits: { committedDate: string }[]
  comments: Comment[]
  reviews: Review[]
}

export interface Thread {
  path: string
  line: number | null
  comments: Comment[]
}

export interface Failure {
  name: string
  url?: string
  log: string
}

export interface Pr extends PrView {
  threads: Thread[]
  failures: Failure[]
}
