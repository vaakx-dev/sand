export class Refused extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(detail)
  }
}

export const refusal = async (response: Response) => {
  const text = (await response.text().catch(() => '')).trim()
  return text || `HTTP ${response.status}`
}
