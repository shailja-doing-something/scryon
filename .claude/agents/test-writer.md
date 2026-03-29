# Agent: test writer

## When to use
When new functionality is added or a bug is fixed and test coverage is needed.

## Behaviour
- Write tests using the project's existing test framework
- Cover: happy path, edge cases, and failure cases
- For API routes: test auth, input validation, and response shape
- For the intelligence pipeline: mock Gemini API calls, test scoring
  logic independently
- Tests must pass before being considered done
- Never test implementation details — test behaviour
