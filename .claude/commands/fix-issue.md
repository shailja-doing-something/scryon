# Command: fix-issue

## Usage
/fix-issue #<issue-number>

## What Claude does
1. Fetches the issue using: gh issue view <number>
2. Understands the reported bug or requested change
3. Locates the relevant files
4. Implements the fix
5. Writes or updates tests to cover the fix
6. Runs the test suite
7. Summarises changes ready to paste as a PR description

## Requirements
GitHub CLI (gh) must be authenticated.
