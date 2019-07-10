import isGeneratorFunction from './is-generator';
import Task, { isTask } from './task';

export default class Execution {
  static of(task) {
    return new Execution(task, x => x);
  }

  get isUnstarted() { return this.status instanceof Unstarted; }
  get isRunning() { return this.status instanceof Running; }
  get isBlocking() { return this.isRunning || this.isWaiting; }
  get isCompleted() { return this.status instanceof Completed; }
  get isErrored() { return this.status instanceof Errored; }
  get isHalted() { return this.status instanceof Halted; }
  get isWaiting() { return this.status instanceof Waiting; }

  get hasBlockingChildren() { return this.children.some(child => child.isBlocking); }

  get result() { return this.status.result; }

  constructor(task, continuation) {
    this.task = Task(task);
    this.continuation = continuation;
    this.status = new Unstarted(this);
    this.children = [];
  }

  start(args) {
    this.status.start(args);
  }

  resume(value) {
    this.status.resume(value);
  }

  throw(error) {
    this.status.throw(error);
  }

  halt(message) {
    this.status.halt(message);
  }

  fork(task, ...args) {
    this.status.fork(task, args);
  }
}

class Status {
  constructor(execution) {
    this.execution = execution;
  }
}

class Unstarted extends Status {
  start(args) {
    let { generator } = this.execution.task;
    let { execution } = this;

    let iterator = generator.apply(execution, args);

    execution.status = new Running(execution, iterator);
    execution.resume();
  }
}

class Running extends Status {
  constructor(execution, iterator, current = { done: false }) {
    super(execution);
    this.iterator = iterator;
    this.current = current;
  }

  thunk(thunk) {
    let { execution, iterator } = this;
    try {
      let next = thunk(iterator);
      if (next.done) {
        if (execution.hasBlockingChildren) {
          execution.status = new Waiting(execution, next.value);
        } else {
          finalize(execution, new Completed(execution, next.value));
        }
      } else {
        let control = controllerFor(next.value);
        control(execution);
      }
    } catch (e) {
      // error was not caught in the generator.
      finalize(execution, new Errored(execution, e));
      // TODO: halt all children

    }
  }

  resume(value) {
    this.thunk(iterator => iterator.next(value));

  }

  throw(error) {
    this.thunk(iterator => iterator.throw(error));
  }

  halt(message) {
    let { execution, iterator } = this;
    iterator.return();
    finalize(execution, new Halted(execution, message));
    // execution.children.forEach(child => {
    //   if (child.isBlocking) {
    //     child.halt(message);
    //   }
    // });
  }

  fork(task, args) {
    let { execution }  = this;

    let continuation = child => {

    };

    let child = new Execution(task, continuation);
    execution.children.push(child);
    child.start(args);
  }
}

class Completed extends Status {
  constructor(execution, result) {
    super(execution);
    this.result = result;
  }
}

class Errored extends Status {
  constructor(execution, error) {
    super(execution);
    this.result = error;
  }
}

class Halted extends Status {
  constructor(execution, message) {
    super(execution);
    this.result = message;
  }
}

class Waiting extends Completed {

  halt(message) {
    let { execution } = this;
    execution.children.forEach(child => {
      if (child.isBlocking) {
        child.halt(message);
      }
    });
    finalize(execution, new Halted(execution, message));
  }
}

function finalize(execution, status) {
  execution.status = status;
  execution.continuation(execution);
}

function controllerFor(value) {
  if (isGeneratorFunction(value) || isTask(value)) {
    return call(value);
  } else if (typeof value === 'function') {
    return value;
  } else {
    throw new Error('generators should yield either another generator or control function, not `${value}`');
  }
}

function call(task, ...args) {
  return execution => {
    let continuation = child => {
      if (child.isCompleted) {
        if (execution.isRunning) {
          return execution.resume(child.result);
        } else if (execution.isWaiting) {
          throw new Error('TODO');
        } else {
          throw new Error('TODO');
        }
      } else if (child.isErrored) {
        execution.throw(child.result);
      } else if (child.isHalted) {
        execution.throw(new Error(`Interuppted: ${child.result}`));
      } else {
        throw new Error('TODO!');
      }
    };
    let child = new Execution(task, continuation);
    execution.children.push(child);
    child.start(args);
  };
}
