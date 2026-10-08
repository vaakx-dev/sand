export class TaskQueue {
  private tail = Promise.resolve()

  constructor(private report: (error: unknown) => void) {}

  get settled() {
    return this.tail
  }

  run(task: () => Promise<void>) {
    this.tail = this.tail.then(task).catch(this.report)
    return this.tail
  }
}
