/* global describe, beforeEach, it */
import mock from 'jest-mock';
import expect from 'expect';
import { Execution as _Execution } from '../src/index';

function Execution(...args) {
  return _Execution.of(...args);
}

describe('Nested execution', () => {
  let execution;

  describe('Execution with children', () => {
    let bodyOne, execOne;
    let bodyTwo, execTwo;

    beforeEach(() => {
      bodyOne = mock.fn(exec => execOne = exec);
      bodyTwo = mock.fn(exec => execTwo = exec);
      execution = Execution(function() {
        this.fork(function*() {
          yield bodyOne;
        });
        this.fork(function*() {
          yield bodyTwo;
        });
      });
    });

    describe('running the operation', () => {
      beforeEach(() => {
        execution.start();
      });
      it('is considered waiting', () => {
        expect(execution.isWaiting).toEqual(true);
      });
      it('is considered blocking', () => {
        expect(execution.isBlocking).toEqual(true);
      });

      describe('completing one, but not both of the child operations', () => {
        beforeEach(() => {
          execOne.resume();
        });
        it('is still considered waiting', () => {
          expect(execution.isBlocking).toEqual(true);
        });
        it('completes the child', () => {
          expect(execOne.isCompleted).toEqual(true);
        });
      });

      describe('completing both of the child operations', () => {
        beforeEach(() => {
          execOne.resume();
          execTwo.resume();
        });

        it('is no longer blocking', () => {
          expect(execution.isBlocking).toEqual(false);
        });
      });

      describe('halting the parent operation', () => {
        beforeEach(() => {
          execution.halt('reason');
        });

        it('halts all of the children', () => {
          expect(execOne.isHalted).toEqual(true);
          expect(execTwo.isHalted).toEqual(true);
        });
      });

      describe('having one of the children error out programatically', () => {
        beforeEach(() => {
          execTwo.fail(new Error('this is bad news'));
        });
        it('errors the parent', () => {
          expect(execution.isErrored).toEqual(true);
        });

        it('halts its siblings', () => {
          expect(execOne.isHalted).toEqual(true);
        });
      });
    });

  });

  describe('forking a child synchronously that is specified as a generator', () => {
    let inner;
    beforeEach(() => {
      execution = Execution(function* () {
        yield Execution(function*() {
          yield Execution(function* () {
            yield Execution(function* () {
              yield cxt => inner = cxt;
            });
          });
        });
      });
      execution.start();
    });

    it.skip('calls through to the innermost context', () => {
      expect(inner).toBeDefined();
    });
  });
});
