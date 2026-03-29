#!/bin/bash
echo "Running pre-commit checks..."

npm run lint
if [ $? -ne 0 ]; then
  echo "BLOCKED: Fix lint errors before committing."
  exit 1
fi

npm run test
if [ $? -ne 0 ]; then
  echo "BLOCKED: Fix failing tests before committing."
  exit 1
fi

if grep -r "GEMINI_API_KEY\s*=" --include="*.ts" --include="*.tsx" app/; then
  echo "BLOCKED: Hardcoded API key detected. Use environment variables."
  exit 1
fi

echo "All checks passed. Proceeding with commit."
exit 0
