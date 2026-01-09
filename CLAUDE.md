- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

- Your user is an experienced developer who is deeply familiar with the codebase you are working on. Sometimes the best way to figure out an implementaion is to ask.

- When planning, ask a lot of question, clarify all assumptions

- When working on tasks, always save your progress in a markdown file. Typically a task will be associated to a notion task (eg. TASK-2579). Name the markdown file after the task, write the plan, details etc for the task and todos. Each time a todo is completed, update the markdown file.
- Use the branch  naming conventions TASK-2707/improve-excel-parsing for tasks chore/... for chores fix/... for ad hoc fixes

- When running inline scripts to inspect files/data:
  - Don't use `node -e` with CommonJS require() - modules won't resolve in pnpm monorepo
  - Use `pnpm exec tsx -e` with ES module imports instead

- Always perfer functional style when possible. Prefer pure functions, and then write unit tests on those function if they are in any way complex.

- When crafing complex bash one liners, always wrap it in a `bash -c '... | ...'`
- When running commands that need env vars (like API keys), use `bash -c '...'` wrapper - Claude Code's shell context may not inherit env vars properly, but `bash -c` spawns a subprocess that does

Use parametric polymorphism because it lets your functions work for any type while staying safe and reusable.
Use endomorphisms because keeping input and output types the same makes functions easier to chain and reason about.
Use type-compatible composition because matching types between functions gives you clean, modular pipelines that just work.

I like the strategy pattern and factory pattern too.

Use the testing pyramid. Most tests should be unit tests. Then fewer should be integration. Finally only a small number should be e2e, to test the happy path.

We don't use rpc for anything complex, we actually ship everything as a unit. You can re name and renumber methods no problem

When using vitest, use the dot reporter and use silent if possible to save on tokens

Most of the time there is a dev db at psql postgresql://user:pass@localhost:9000/postgresql
