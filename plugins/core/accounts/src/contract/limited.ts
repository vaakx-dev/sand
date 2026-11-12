export class UsageLimited extends Error {
  override name = 'UsageLimited'

  constructor(
    message: string,
    readonly resetsAt?: number,
  ) {
    super(message)
  }
}
