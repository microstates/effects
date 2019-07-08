/* global describe, beforeEach, it */
import mock from 'jest-mock';
import expect from 'expect';
import { Execution } from '../src/execution';

describe('Execution', () => {
  describe('for trivial generators', () => {
    let execution;
    let begin, middle, end, ensure;

    beforeEach(() => {
      begin = mock.fn();
      end = mock.fn();
      execution = Execution.of(function* (arg) {
        try {
          begin(arg);
          try {
            middle = yield;
          } catch (e) {
            error = e;
          }
          end();
          return 'this is the end';
        } finally {
          ensure = 'ensured';
        }
      });
    });

    it('is idle', () => {
      expect(execution.isIdle).toEqual(true);
    });
    it('does not run the generator at all', () => {
      expect(begin).not.toHaveBeenCalled();
    });

    describe('starting the operation', () => {
      let object;
      beforeEach(() => {
        object = {};
        execution.start([object]);
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
          execution.resume("middle");
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
          execution.halt('please halt');
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
          execution.resume();
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

      describe('causing the execution to fail programatically', () => {
        let error;
        beforeEach(() => {
          try {
            execution.fail(new Error('an error occured'));
          } catch (e) {
            error = e;
          }
        });
        it('throws the error', () => {
          expect(error).toBeUndefined();
        });
        it('transitions to an error state', () => {
          expect(execution.isErrored).toEqual(true);
        });
      });
    });
  });

  describe('An exceution that caches an exception and then yields again', () => {
    let execution, error, boom;

    function* generator() {
      try {
        yield;
      } catch (e) {
        error = e;
      }

      yield;
    }

    beforeEach(() => {
      boom = new Error('boom!');
      execution = Execution.of(generator);
      execution.start();
      execution.fail(boom);
    });

    it('raises the exception inside the generator', () => {
      expect(error).toEqual(boom);
    });

    it('is still running', () => {
      expect(execution.isRunning).toEqual(true);
    });
  });

  describe('An execution that catches an exception and then is done', () => {
    let execution;

    beforeEach(() => {
      execution = Execution.of(function*() {
        try {
          yield;
        } catch (e) {
          //catch the error;
        }
      });
      execution.start();
      execution.fail(new Error('boom!'));
    });
    it('is completed', () => {
      expect(execution.isCompleted).toEqual(true);
    });
  });

});
