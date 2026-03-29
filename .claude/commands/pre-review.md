# Command: pre-review

## Usage
/pre-review

## What Claude does
1. Runs code-reviewer agent on all staged changes
2. Runs security-auditor agent on all staged changes
3. Checks every new function has a corresponding test
4. Checks no environment variables are hardcoded
5. Produces a single report: ready to merge / needs fixes
