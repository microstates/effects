import Gate from './gate';

export class Effect {
  static of(action) {
    if (action instanceof Effect) {
      return action;
    } else {
      return new Effect(action);
    }
  }

  static empty() {
    return Effect.of(x => x);
  }

  constructor(action) {
    this.action = action;
  }

  chain(sequence) {
    return sequence(this.action);
  }

  open(input) {
    this.action(Gate.open(input));
  }

  close() {
    this.action(Gate.closed());
  }
}
