FROM node:20-bookworm-slim

WORKDIR /app/services/auth

RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY services/auth/package.json services/auth/tsconfig.json services/auth/nest-cli.json services/auth/jest.config.js ./
COPY services/auth/prisma ./prisma
COPY services/auth/src ./src
COPY shared /app/shared

RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["node","dist/services/auth/src/main.js"]
