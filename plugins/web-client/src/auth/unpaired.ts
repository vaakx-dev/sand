export class Unpaired extends Error {
  constructor(message = "This browser isn't paired with sand") {
    super(message)
    this.name = 'Unpaired'
  }
}
