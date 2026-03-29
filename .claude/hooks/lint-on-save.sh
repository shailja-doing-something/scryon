#!/bin/bash
FILE=$1
if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  npx eslint "$FILE" --fix
fi
