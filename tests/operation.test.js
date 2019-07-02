/* global describe, beforeEach, it */
import mock from 'jest-mock';
import expect from 'expect';
import { Operation } from '../src/index';

describe('Operation', () => {
  describe('for trivial generators', () => {
    let operation;
    let begin, middle, end, ensure;

    beforeEach(() => {
      begin = mock.fn();
      end = mock.fn();
      operation = Operation.of(function* (arg) {
        try {
          begin(arg);
          middle = yield;
          end();
          return 'this is the end';
        } finally {
          ensure = 'ensured';
        }
      });
    });

    it('does not run the generator at all', () => {
      expect(begin).not.toHaveBeenCalled();
    });

    describe('starting the operation', () => {
      let object;
      let execution;
      beforeEach(() => {
        object = {};
        execution = operation.execute(object);
      });

      it('is now running', () => {
        expect(execution.isRunning).toEqual(true);
      });

      it('is considered blocking', () => {
        expect(execution.isBlocking).toEqual(true);
      });

      it('starts execution of the generator', () => {
        expect(begin).toHaveBeenCalledWith(object);
      });

      it('stops at the point of yield', () => {
        expect(middle).toBeUndefined();
        expect(end).not.toHaveBeenCalled();
      });

      describe('and then continuing it to completion', () => {
        beforeEach(() => {
          execution = execution.resume("middle");
        });
        it('passes the resume value into the generator', () => {
          expect(middle).toEqual('middle');
        });
        it('continues execution', () => {
          expect(end).toHaveBeenCalled();
        });
        it('is now complete', () => {
          expect(execution.isCompleted).toEqual(true);
        });
        it('is not considered blocking anymore', () => {
          expect(execution.isBlocking).toEqual(false);
        });
        it('contains the result', () => {
          expect(execution.result).toEqual('this is the end');
        });
        it('executes the finally block', () => {
          expect(ensure).toEqual('ensured');
        });
      });

      describe('and halting it mid-way', () => {
        beforeEach(() => {
          execution = execution.halt('please halt');
        });
        it('is halted', () => {
          expect(execution.isHalted);
        });
        it('is not considered blocking', () => {
          expect(execution.isBlocking).toEqual(false);
        });
        it('does not execute the second half of the function', () => {
          expect(end).not.toHaveBeenCalled();
        });
        it('does execute the finally block', () => {
          expect(ensure).toEqual('ensured');
        });
        it('has as its result the halt value', () => {
          expect(execution.result).toEqual('please halt');
        });
      });

      describe('and when an exception occurs', () => {
        let error;
        beforeEach(() => {
          error = new Error('an error occured');
          end = mock.fn(() => { throw error; });
          execution = execution.resume();
        });
        it('is an instance of errored', () => {
          expect(execution.isErrored).toEqual(true);
        });
        it('is not considered blocking', () => {
          expect(execution.isBlocking).toEqual(false);
        });
        it('runs the finally block', () => {
          expect(execution.result).toEqual(error);
        });
      });
    });
  });
});
