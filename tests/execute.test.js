/* global describe, beforeEach, it */
/* eslint require-yield: 0 */
/* eslint no-unreachable: 0 */

import expect from 'expect';

import { execute } from '../src/index';

describe('Exec', () => {
  describe('deeply nested task', () => {
    let inner, execution, error;
    beforeEach(() => {
      execution = execute(function*() {
        try {
          return yield function*() {
            return yield function*() {
              return yield ctl => inner = ctl;
            };
          };
        } catch (e) {
          error = e;
        }
      });
    });

    it('calls all the way through to the inner child', () => {
      expect(inner).toBeDefined();
    });

    describe('resuming the inner child', () => {
      beforeEach(() => {
        expect(inner).toBeDefined();
        inner.resume(10);
      });

      it('completes the outer execution', () => {
        expect(execution.isCompleted).toEqual(true);
        expect(execution.isBlocking).toEqual(false);
      });

      it('completes the inner execution', () => {
        expect(inner.isCompleted).toEqual(true);
        expect(inner.isBlocking).toEqual(false);
      });

      it('passes values up through the stack', () => {
        expect(execution.result).toEqual(10);
      });
    });

    describe('throwing an error into the inner child', () => {
      let err;
      beforeEach(() => {
        expect(inner).toBeDefined();
        inner.throw(err = new Error('boom!'));
      });

      it('errors out the inner execution', () => {
        expect(inner.isErrored).toEqual(true);
        expect(inner.isBlocking).toEqual(false);
      });

      it('completes the outer execution', () => {
        expect(error).toEqual(err);
        expect(execution.isCompleted).toEqual(true);
        expect(execution.isBlocking).toEqual(false);
      });
    });

    describe('halting the inner child', () => {
      beforeEach(() => {
        expect(inner).toBeDefined();
        inner.halt('kill it with fire');
      });

      it('halts the inner child', () => {
        expect(inner.isHalted).toEqual(true);
      });

      it('errors out the parents that depended on it', () => {
        expect(execution.isCompleted).toEqual(true);
        expect(error.message).toMatch(/kill it with fire/);
      });
    });

  });

  describe('deeply nested task that throws an error', () => {
    let execution, error;
    beforeEach(() => {
      execution = execute(function*() {
        try {
          return yield function*() {
            return yield function*() {
              throw new Error('boom!');
            };
          };
        } catch (e) {
          error = e;
        }
      });
    });
    it('throws the error all the way up to the top', () => {
      expect(error.message).toEqual('boom!');
    });

    it('completes the execution', () => {
      expect(execution.isCompleted).toEqual(true);
    });
  });

});
