#!/bin/sh

echo "==> Running database migrations..."
if npx prisma migrate deploy; then
  echo "==> Migrations complete"
else
  echo "==> Migration failed or skipped — starting server anyway"
fi

echo "==> Starting application..."
exec npm start
