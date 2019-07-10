/* global describe, beforeEach, it */
import expect from 'expect';

import Continuation from '../src/continuation';

describe('Continuation', () => {
  let continuation;

  describe('of a simple function', () => {
    beforeEach(() => {
      continuation = Continuation.of(x => x);
    });

    it('calls the function when invoked', () => {
      expect(continuation.call(5)).toEqual(5);
    });
  });

  describe('of a constant', () => {
    beforeEach(() => {
      continuation = Continuation.resolve(5);
    });

    it('evaluates to the constant itself', () => {
      expect(continuation.call('nothing matters')).toEqual(5);
    });
  });

  describe('of a failure', () => {
    beforeEach(() => {
      continuation = Continuation.reject(new Error('boom!'));
    });
    it('throws an error when called', () => {
      expect(() => continuation.call()).toThrow();
    });
  });

  describe('mapping a successful continuation', () => {
    beforeEach(() => {
      continuation = Continuation.of(x => x * 2)
        .then(x => x * 2);
    });

    it('successively calls the function', () => {
      expect(continuation.call(5)).toEqual(20);
    });
  });

  describe('mapping a successful continuation that returns a different continuation', () => {
    beforeEach(() => {
      continuation = Continuation.of(x => x * 2)
        .then(() => Continuation.resolve('hello world'));
    });
    it('uses the value of the continuation first', () => {
      expect(continuation.call(10)).toEqual('hello world');
    });
  });

  describe('catching a failure', () => {
    beforeEach(() => {
      continuation = Continuation.reject('boom!')
        .catch(e => e);
    });

    it('has access to the error value', () => {
      expect(continuation.call()).toEqual('boom!');
    });
  });


  describe('catching a failure, when no failure happens', () => {
    beforeEach(() => {
      continuation = Continuation.resolve('success!')
        .catch(() => { throw new Error('boom!'); });
    });

    it('calls just like normal', () => {
      expect(continuation.call()).toEqual('success!');
    });
  });

  describe('specifying a finally block', () => {
    let final;
    beforeEach(() => {
      continuation = Continuation.of(fn => fn())
        .finally(() => final = 'countdown');
    });

    describe('when the operation succeeds', () => {
      let result;
      beforeEach(() => {
        result = continuation.call(() => 'success!');
      });
      it('still runs the finally block', () => {
        expect(final).toEqual('countdown');
        expect(result).toEqual('success!');
      });
    });

    describe('when the operation fails', () => {
      it('still runs the finally block', () => {
        expect(() => continuation.call(() => { throw new Error('boom!'); })).toThrow();
        expect(final).toEqual('countdown');
      });
    });

  });

  describe('very deeply nested', () => {
    beforeEach(() => {
      continuation = Continuation.resolve(10)
        .then(x => x * 2)
        .then(() => Continuation.reject(100))
        .catch(num => num * 5)
        .then(x => Continuation.resolve(x * 2));
    });

    it('computes', () => {
      expect(continuation.call(10)).toEqual(1000);
    });
  });

});
