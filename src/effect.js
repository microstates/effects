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

  concat(next) {
    return this.chain(action => Effect.of(gate => {
      action(gate);
      Effect.of(next).action(gate);
    }));
  }

  enter(fn) {
    let entered = false;
    return this.update(value => {
      if (!entered) {
        fn(value);
        entered = true;
      }
    });
  }

  update(fn) {
    return this.concat(gate => {
      gate.ifOpen(fn);
    });
  }

  leave(fn) {
    let entered = false;
    return this
      .enter(() => entered = true)
      .concat(gate => {
        gate.ifClosed(() => {
          if (entered === true) {
            entered = false;
            fn();
          }
        });
      });
  }

  open(input) {
    this.action(Gate.open(input));
  }

  close() {
    this.action(Gate.closed());
  }
}
