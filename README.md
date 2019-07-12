# @microstates/effects

Effortlessly composable structured concurrency primitive for
JavaScript

## Structured Concurrency and Effects

Lots of bugs occur when asynchronous processes outlive their
welcome. The concept of structured concurrency avoids these altogether
by enforting the following constraints.

1. A process is pending when it is either running or when it has _any_
   child process that is pending.
2. If an error occurs in a process that is not caught, then that error
   propagates to the parent process
3. If a process finishes in error or by halting, then all of its child
   process are immediately halted.


<!--

## See Also

Microstates Effects is heavily inspired by the ideas behind
[ember-concurrency][1] and [trio][2]

## FAQ

Q: Are microstates required to use @microstates/effects?

A: No! Microstates effects are just plain old JavaScript functions and
generators, and can be used with anything.

-->
