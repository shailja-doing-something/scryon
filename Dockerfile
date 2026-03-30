FROM node:22

WORKDIR /app

# Build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

# Force recompile better-sqlite3 from source for this exact Node 22 ABI
# (prebuild-install may grab a mismatched prebuilt binary otherwise)
RUN npm rebuild better-sqlite3

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

# Run migrations then start the server (shell form so && works and stdout is captured)
CMD npx prisma migrate deploy && npm start
