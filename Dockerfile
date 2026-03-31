FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

CMD npx prisma migrate deploy && npm start
