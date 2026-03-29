# Command: deploy

## Usage
/deploy

## What Claude does
1. Runs npm run lint — stops if any errors
2. Runs npm run build — stops if build fails
3. Runs npm run test — stops if any tests fail
4. Runs npx prisma migrate deploy
5. Confirms all environment variables are present
6. Outputs a deploy-ready summary with git commands to run

## Hard rule
Claude never runs git push or railway up automatically.
The human always does the final push.
