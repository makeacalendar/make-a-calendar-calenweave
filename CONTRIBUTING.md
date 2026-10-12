# Contributing

Contributions should preserve the date-only model, avoid runtime-specific
globals in core modules, document edge behavior, and include meaningful tests
for public behavior.

Before opening a pull request, run `deno fmt`, `deno lint`, `deno check mod.ts`,
`deno test`, and `deno doc --lint mod.ts` with Deno 2.x. Keep changes focused
and describe any calendar policy assumptions.
