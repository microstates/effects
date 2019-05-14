declare module "@microstates/effects" {

  export const Effect: EffectConstructor;

  interface EffectConstructor {
    of<T>(action: Action<T> | Effect<T>) : Effect<T>;
    empty<T>(): Effect<T>;
  }

  interface Effect<Input> {
    chain<Output>(sequence: Sequence<Input, Output>): Effect<Output>;

    concat(next: Action<Input> | Effect<Input>) : Effect<Input>;

    update(action: Action<Input>): Effect<Input>;

    enter(action: Action<Input>): Effect<Input>;

    leave(action: Action<Input>): Effect<Input>;

    children(define: (effects: Effect<Input>) => Effect<Input>): Effect<Input>;

    open(value: Input): void;

    close(): void ;
  }

  type Action<Input> = (gate: Gate<Input>) => void;

  type Sequence<Input, Output> = (action: Action<Input>) => Effect<Output>;

  export interface Gate<Input> {
    isOpen: boolean;
    isClosed: boolean;
    ifOpen(fn: (input: Input) => void): Gate<Input>;
    ifClosed(fn: () => void): Gate<Input>;
  }
}
