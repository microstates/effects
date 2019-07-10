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
        it('considers the entire task complete', () => {
          expect(execution.isCompleted).toEqual(true);
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

  });
});
