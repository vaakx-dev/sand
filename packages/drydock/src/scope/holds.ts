export class Holds {
  private count = 0

  constructor(private onRelease: () => void) {}

  get idle() {
    return this.count === 0
  }

  take() {
    this.count++
    let released = false
    return () => {
      if (released) return
      released = true
      this.count--
      this.onRelease()
    }
  }
}
