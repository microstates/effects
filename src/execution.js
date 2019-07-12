import isGeneratorFunction from './is-generator';
import Task, { isTask } from './task';
import Continuation from './continuation';

export default class Execution {
  static of(task) {
    return new Execution(task, x => x);
  }

  get isUnstarted() { return this.status instanceof Unstarted; }
  get isRunning() { return this.status instanceof Running; }
  get isBlocking() { return this.isRunning || this.isWaiting; }
  get isCompleted() { return this.status instanceof Completed; }
  get isErrored() { return this.status instanceof Errored; }
  get isHalting() { return this.status instanceof Halting; }
  get isHalted() { return this.status instanceof Halted; }
  get isWaiting() { return this.status instanceof Waiting; }

  get hasBlockingChildren() { return this.children.some(child => child.isBlocking); }

  get result() { return this.status.result; }

  constructor(task, callback = x => x) {
    this.task = Task(task);
    this.callback = callback;
    this.status = new Unstarted(this);
    this.children = [];
    this.continuation = ExecutionFinalized;
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

  then(...args) {
    this.continuation = this.continuation.then(...args);
    return this;
  }

  catch(...args) {
    this.continuation = this.continuation.catch(...args);
    return this;
  }

  finally(...args) {
    this.continuation = this.continuation.finally(...args);
    return this;
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
    execution.children.forEach(child => {
      if (child.isBlocking) {
        child.halt(message);
      }
    });
    iterator.return();
    finalize(execution, new Halted(execution, message));
  }

  fork(task, args) {
    let parent = this.execution;

    let child = new Execution(task).then(child => {
      if (child.isHalted || child.isCompleted) {
        if (!parent.hasBlockingChildren) {
          finalize(parent, new Completed(parent, parent.result));
        }
      } else {
        throw new Error('a finalized child must be either Halted, Errored, or Completed, not ' + child.status.constructor.name);
      }
    }).catch(e => parent.throw(e));
    parent.children.push(child);
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

class Halting extends Halted {}

class Waiting extends Completed {

  halt(message) {
    let { execution } = this;
    execution.status = new Halting(execution, message);
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
  execution.callback(execution);
  try {
    execution.continuation.call(execution);
  } catch (e) {
    // console.warn('uncaught continuation error');
  }
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
  return parent => {
    let child = new Execution(task).then(child => {
      if (child.isCompleted) {
        return parent.resume(child.result);
      }
      if (child.isHalted) {
        parent.throw(new Error(`Interuppted: ${child.result}`));
      }
    }).catch(e => parent.throw(e));

    parent.children.push(child);
    child.start(args);
  };
}


const ExecutionFinalized = Continuation.of(execution => {
  if (execution.isErrored) {
    let error = execution.result;
    error.execution = execution;
    throw error;
  } else {
    return execution;
  }
});
