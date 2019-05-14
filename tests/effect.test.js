/* global describe, it, beforeEach */
import expect from 'expect';
import { Effect } from '../src/index';
import mock from 'jest-mock';

describe('Effect', function() {
  let effect;
  let spy;
  describe('empty', () => {
    beforeEach(() => {
      spy = mock.fn();
      effect = Effect.of(spy);
    });
    describe('when open', () => {
      beforeEach(() => {
        effect.open(5);
      });
      it('calls the effect when open', () => {
        expect(spy).toHaveBeenCalledWith({ value: 5 });
      });
    });
    describe('when closed', () => {
      beforeEach(() => {
        effect.close();
      });
      it('calls the effect with a closed gate', () => {
        expect(spy).toHaveBeenCalledWith({});
      });
    });
  });

  describe('chanining an effect that is only every called twice per opening', () => {
    beforeEach(() => {
      spy = mock.fn();
      effect = Effect.of(spy)
        .chain(action => {
          let calls = 0;
          return Effect.of(gate => {
            gate.ifOpen(() => {
              if (calls < 2) {
                calls++;
                action(gate);
              }
            });

            gate.ifClosed(() => {calls = 0;});
          });
        });
      effect.open('hello');
      effect.open('goobye');
      effect.open('nevermore');
      effect.open('nevermore');
      effect.open('nevermore');
    });

    it('only invokes the spy twice', () => {
      expect(spy).toHaveBeenCalledTimes(2);
    });

    describe('closing the effect and then calling again', () => {
      beforeEach(() => {
        spy.mockReset();
        effect.close();
        effect.open('hello');
      });
      it('begins invoking the spy again', () => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
