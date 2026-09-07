# Comments

Applies to every language in this repo — TypeScript, C#, templates, specs.

## The rule

**Write a comment only when the surrounding code cannot be made to explain itself.** A comment is an exception, not a normal part of writing code. Its presence is a claim that you tried to make the code say this and could not.

That claim is usually false. Before writing one, try to delete it:

| The comment explains | Try instead |
| --- | --- |
| What a block does | Extract it into a named function |
| What a value means | Name the variable, or give it a branded type |
| Which case a branch handles | A named predicate or a discriminated union |
| That a number is significant | A named constant |

If one of those works, the comment was a smell — it was describing badly-shaped code rather than adding information. Reshape the code and the comment disappears with it.

## What survives the test

The comments worth keeping explain **why**, and specifically a *why* that is not visible from the code:

- **An ordering constraint** — this must happen before that, and the reason is in a different file. `DialogService.open()` calling `dialogRef.instance.open()` last is a real example: nothing at the call site shows that content can emit `result` synchronously from `onOpened`.
- **A workaround for something external** — a framework behaviour, a browser quirk, a library bug. Name the thing being worked around.
- **A deliberate choice that reads as a mistake** — the code a maintainer would "fix" and thereby break. `DialogService` not injecting `AuthService` is one: the alternative is a cyclic-DI error at runtime, and nothing local says so.
- **A suppression** — `// eslint-disable-next-line` and `@ts-expect-error` always carry their reason. That is a hard rule (see [frontend-conventions.md](frontend-conventions.md#typescript-strictness)).

Everything else is noise, and noise costs more than nothing: comments are not compiled, not tested, and not reviewed as carefully as code, so they drift into lying.

## What never earns a comment

- Restating the line below it in prose.
- Section banners (`// --- helpers ---`) — that is a file that wants splitting.
- Commented-out code. Git remembers it.
- A name or a date. `git blame` knows.
- Type or parameter documentation that repeats the signature.

## Length

**A comment that outgrows the code it guards is a signal, not a comment.** Two lines is a normal maximum. If the explanation needs a paragraph, the design is too subtle to leave in place — simplify it, or if it genuinely cannot be simplified, write the paragraph in the doc that covers that area and leave a one-line pointer at the code.

Reaching for a fourth line of explanation means asking a different question: why does this code need this much defending?

## Doc comments are a different thing

TSDoc/XML-doc on an **exported** symbol is API documentation for callers who will never open the implementation, and is judged by a different standard: it describes a contract, not a mechanism. `DialogOptions.bindings` documenting that bindings are not readable in `onOpened` is legitimate — a caller cannot discover that from the type.

Still, only where the contract is non-obvious. A doc comment restating what the name and signature already say is the same noise in a nicer wrapper.

## Tests

**Comments inside a test body are the strongest smell of all.** A test is already a description of behaviour; needing prose to explain it means one of two things, and each has its own fix:

- **The product behaviour is surprising.** The explanation belongs in the production code — that is where the next reader will be confused — or in the test name. Not buried in the body.
- **The test is hard to read.** Fix the test: name the fixtures, extract the setup, split the case. A comment here just makes an unreadable test longer.

The one legitimate form is **structural** — marking the preconditions, the action, and the checks:

```typescript
it('should fire event after animation', async () => {
  // given
  fixture.componentRef.setInput('value', 0);

  // when
  fixture.componentRef.setInput('value', 5);
  await TestBed.tick();

  // then
  expect(emitted).toBe(true);
});
```

Those are signposts, not explanation. They stay short and they never say *why*. If a `// then` block needs a sentence justifying what it asserts, the assertion is testing something the product should have made obvious.

Test names carry the meaning: `it('should fire event after animation')` reads as a sentence, and a case that cannot be named that way is usually testing more than one thing.
