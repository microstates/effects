/* global describe, beforeEach, it */
import mock from 'jest-mock';
import expect from 'expect';
import { Operation as _Operation } from '../src/index';

function Operation(...args) {
  return new _Operation(...args);
}

describe.skip('Operation with children', () => {

  let operation;
  let bodyOne, execOne;
  let bodyTwo, execTwo;

  beforeEach(() => {
    bodyOne = mock.fn(exec => execOne = exec);
    bodyTwo = mock.fn(exec => execTwo = exec);
    operation = Operation(function() {
      this.fork(Operation(function*() {
        yield bodyOne(this);
      }));
      this.fork(Operation(function*() {
        yield bodyTwo(this);
      }));
    });
  });

  describe('running the operation', () => {
    let execution;
    beforeEach(() => {
      execution = operation.execute();
    });
    it('is considered waiting', () => {
      expect(execution.isWaiting).toEqual(true);
    });
    it('is considered blocking', () => {
      expect(execution.isBlocking).toEqual(true);
    });
  });
});
