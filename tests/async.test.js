/* global describe, beforeEach, it */
/* eslint require-yield: 0 */
/* eslint no-unreachable: 0 */

import expect from 'expect';

import { execute } from '../src/index';

describe('Async executon', () => {
  describe('with asynchronously executing children', () => {
    let execution, one, two, three;

    beforeEach(() => {
      execution = execute(function() {
        this.fork(function*() {
          yield cxt => one = cxt;
        });

        this.fork(function*() {
          yield cxt => two = cxt;
        });

        this.fork(function*() {
          yield cxt => three = cxt;
        });
      });
    });
    it('begins execution of each child immediately', () => {
      expect(one).toBeDefined();
      expect(two).toBeDefined();
      expect(three).toBeDefined();
    });

    it('consideres the execution to be completed, but waiting and blocking', () => {
      expect(execution.isWaiting).toEqual(true);
      expect(execution.isBlocking).toEqual(true);
    });

    describe('finishing two of the children', () => {
      beforeEach(() => {
        one.resume();
        two.resume();
      });

      it('considers them complete and non blocking', () => {
        expect(one.isCompleted).toEqual(true);
        expect(one.isBlocking).toEqual(false);

        expect(two.isCompleted).toEqual(true);
        expect(two.isBlocking).toEqual(false);
      });

      it('still considers the third child as running', () => {
        expect(three.isRunning).toEqual(true);
      });

      it('considers the top level execution to still be waiting', () => {
        expect(execution.isWaiting).toEqual(true);
      });

      describe('finishing the third and final child', () => {
        beforeEach(() => {
          three.resume();
        });
        it('considers the entire task no longer waiting', () => {
          expect(execution.isWaiting).toEqual(false);
          expect(execution.isBlocking).toEqual(false);
        });
      });
    });

    describe('halting the top level context', () => {
      beforeEach(() => {
        execution.halt();
      });

      it('halts all of the children', () => {
        expect(one.isHalted).toEqual(true);
        expect(two.isHalted).toEqual(true);
        expect(three.isHalted).toEqual(true);
      });
    });


    describe('halting one of the children', () => {
      beforeEach(() => {
        two.halt();
      });
      it('does not cancel anything else', () => {
        expect(execution.isWaiting).toEqual(true);
        expect(one.isRunning).toEqual(true);
        expect(three.isRunning).toEqual(true);
      });
    });

    describe('halting all of the children', () => {
      beforeEach(() => {
        one.halt();
        two.halt();
        three.halt();
      });

      it('completes the top-level execution', () => {
        expect(execution.isCompleted).toEqual(true);
      });
    });

    describe('throwing an error in one of the children', () => {
      let error, boom;
      beforeEach(() => {
        boom = new Error('boom!')
        execution.catch(e => error = e);
        one.throw(boom);
      });

      it('errors out the parent', () => {
        expect(execution.isErrored).toEqual(true);
        expect(error).toEqual(boom);
      });

      it('has the error as its result', () => {
        expect(execution.result).toEqual(boom)
      });
    });

  });

  describe('with some synchronous tasks mixed in', () => {
    let execution, one, two, sync, boom, error;
    beforeEach(() => {
      error = undefined;
      boom = new Error('boom!');
      execution = execute(function*() {
        this.fork(function*() { yield cxt => one = cxt; });
        this.fork(function*() { yield cxt => two = cxt; });
        yield function*() {
          yield cxt => sync = cxt;
        };
      }).catch(e => error = e);
      expect(one).toBeDefined();
      expect(two).toBeDefined();
      expect(sync).toBeDefined();
    });

    describe('throwing from within the synchronous task', () => {
      beforeEach(() => {
        sync.throw(boom);
      });

      it('errors out the top level execution', () => {
        expect(execution.isErrored).toEqual(true);
        expect(error).toEqual(boom);
      });

      it('halts the async children', () => {
        expect(one.isHalted).toEqual(true);
        expect(two.isHalted).toEqual(true);
      });
    });

    describe('throwing from within one of the async tasks', () => {
      beforeEach(() => {
        one.throw(boom);
      });

      it('errors out the top level execution', () => {
        expect(execution.isErrored).toEqual(true);
        expect(error).toEqual(boom);
      });

      it('halts the async children', () => {
        expect(two.isHalted).toEqual(true);
        expect(sync.isHalted).toEqual(true);
      });
    });

    describe('halting the top level execution', () => {
      beforeEach(() => {
        execution.halt();
      });

      it('does not throw an error', () => {
        expect(error).toBeUndefined();
      });

      it('halts the execution, and all its children', () => {
        expect(execution.isHalted).toEqual(true);
        expect(one.isHalted).toEqual(true);
        expect(two.isHalted).toEqual(true);
        expect(sync.isHalted).toEqual(true);
      });
    });
  });
});
