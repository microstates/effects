export class Operation {
  static of(generator) {
    return new Operation(generator);
  }

  constructor(generator) {
    this.generator = generator;
  }

  execute(...args) {
    let iterator = this.generator(...args);
    return new Running(iterator).resume();
  }
}

class Execution {
  constructor(parent) {
    this.parent = parent;
    this.children = [];
  }
  get isRunning() { return this instanceof Running; }
  get isBlocking() { return this.isRunning || this.children.some(child => child.isBlocking); }
  get isCompleted() { return this instanceof Completed; }
  get isErrored() { return this instanceof Errored; }
  get isHalted() { return this instanceof Halted; }
}

class Running extends Execution {
  constructor(iterator, current = { done: false }) {
    super();
    this.iterator = iterator;
    this.current = current;
  }

  get result() {
    return this.current.value;
  }

  resume(value) {
    try {
      let next = this.iterator.next(value);
      if (next.done) {
        return new Completed(next.value);
      } else {
        return new Running(this.iterator, next);
      }
    } catch (error) {
      return new Errored(error);
    }
  }

  halt(value) {
    this.iterator.return(value);
    return new Halted(value);
  }
}

class Completed extends Execution {
  constructor(result) {
    super();
    this.result = result;
  }
}

class Errored extends Execution {
  constructor(error) {
    super(null);
    this.result = error;
  }
}

class Halted extends Execution {
  constructor(value) {
    super();
    this.result = value;
  }
}
