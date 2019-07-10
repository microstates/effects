export default class Continuation {

  static of(fn) {
    return new Continuation(fn);
  }

  static resolve(value) {
    return Continuation.of(() => value);
  }

  static reject(error) {
    return Continuation.of(() => { throw error; });
  }

  static empty() {
    return Continuation.of(x => x);
  }

  constructor(call) {
    this.call = call;
  }

  flatMap(sequence) {
    return sequence(this.call);
  }

  then(fn) {
    return flatMap(this, call => Continuation.of(x => {
      let next = fn(call(x));
      if (next instanceof Continuation) {
        return next.call(x);
      } else {
        return next;
      }
    }));
  }

  catch(fn) {
    return flatMap(this, call => Continuation.of(x => {
      try {
        return call(x);
      } catch(e) {
        return fn(e);
      }
    }));
  }

  finally(fn) {
    return flatMap(this, call => Continuation.of(x => {
      try {
        return call(x);
      } finally {
        fn();
      }
    }));
  }
}

function flatMap(continuation, sequence) {
  return continuation.flatMap(sequence);
  // return sequence(continuation.call);
}
