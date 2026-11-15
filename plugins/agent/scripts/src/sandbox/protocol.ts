interface Start {
  type: 'start'
  code: string
  names: string[]
  stop: SharedArrayBuffer
}

interface Answer {
  type: 'answer'
  id: number
  text: string
  failed: boolean
}

type ToWorker = Start | Answer

interface Call {
  type: 'call'
  id: number
  name: string
  input: string
}

interface Log {
  type: 'log'
  text: string
}

interface End {
  type: 'end'
  value?: string
  error?: string
}

type FromWorker = Call | Log | End

export type { Answer, Call, End, FromWorker, Start, ToWorker }
