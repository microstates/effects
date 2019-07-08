import isGeneratorFunction from './is-generator';

class Task {
  static of(generator) {
    if (isGeneratorFunction(generator)) {
      return new Task(generator);
    } else if (typeof generator === 'function') {
      return new Task(function*(...args) { //eslint-disable-line require-yield
        return generator.call(this, ...args);
      });
    } else if (generator instanceof Task) {
      return generator;
    } else {
      return new Task(function*() { //eslint-disable-line require-yield
        return generator;
      });
    }
  }

  constructor(generator) {
    this.generator = generator;
  }
}

export class Execution {
  static of(generator) {
    let task = Task.of(generator);
    return new Execution(task.generator, new TopLevel());
  }

  constructor(generator, parent) {
    if (parent == null) {
      throw new Error('cannot construct an execution without a parent');
    }
    this.generator = generator;
    this.parent = parent;
    this.children = [];
    this.status = new Idle();
  }
  get isIdle() { return this.status instanceof Idle; }
  get isRunning() { return this.status instanceof Running; }
  get isBlocking() { return this.isRunning || this.children.some(child => child.isBlocking); }
  get isWaiting() { return this.isCompleted && this.isBlocking; }
  get isCompleted() { return this.status instanceof Completed; }
  get isErrored() { return this.status instanceof Errored; }
  get isHalted() { return this.status instanceof Halted; }

  get result() { return this.status.result; }

  start(args) {
    this.status = this.status.start(this, this.generator, args);
    if (this.isRunning) {
      this.resume();
    }
  }

  resume(value) {
    this.status = this.status.resume(value);
  }

  halt(value) {
    this.status = this.status.halt(this, value);
    this.children.forEach(child => child.halt(value));
  }

  fail(error) {
    this.status = this.status.fail(error);
    this.children.forEach(child => {
      if (child.isBlocking) {
        child.halt(error);
      }
    });
    this.parent.fail(error);

  }

  fork(generator, ...args) {
    let task = Task.of(generator);
    let child = new Execution(task.generator, this);
    this.children.push(child);
    child.start(args);
    return child;
  }
}

class Status {
  halt(execution, value) {
    return new Halted(value);
  }

  fail(error) {
    return new Errored(error);
  }
}

class Idle extends Status {
  start(execution, generator, args) {
    let application;
    try {
      application = generator.apply(execution, args);
    } catch (error) {
      return new Errored(error);
    }
    return new Running(execution, application);
  }
}

class Running extends Status {
  constructor(execution, iterator, current = { done: false }) {
    super();
    this.execution = execution;
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
        let control = next.value;
        if (typeof control === 'function') {
          control(this.execution);
        } else if (control instanceof Task) {
          console.log('this is an execution');
          // control
          //   .then()
          //   .catch()
          //   .halt();
          //add child
          //when unblocked
          //when errored
          //when halted??, this is a yield?
        }
        return new Running(this.execution, this.iterator, next);
      }
    } catch (error) {
      return new Errored(error);
    }
  }

  halt(execution, value) {
    this.iterator.return(value);
    return super.halt(execution, value);
  }

  fail(error) {
    try {
      let next = this.iterator.throw(error);
      if (next.done) {
        return new Completed(next.value);
      } else {
        return new Running(this.execution, this.iterator, this.current);
      }
    } catch(e) {
      // error was not caught in generator
      return super.fail(error);
    }
  }
}

class Completed extends Status {
  constructor(result) {
    super();
    this.result = result;
  }
}

class Errored extends Status {
  constructor(error) {
    super();
    this.result = error;
  }
}

class Halted extends Status {
  constructor(value) {
    super();
    this.result = value;
  }
}


class TopLevel {
  fail() {}
}
