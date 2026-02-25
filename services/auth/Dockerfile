FROM node:20-bookworm-slim AS deps
WORKDIR /app/services/auth
RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY services/auth/package.json services/auth/tsconfig.json services/auth/nest-cli.json services/auth/jest.config.js ./
COPY services/auth/prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate

FROM node:20-bookworm-slim AS build
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

FROM node:20-bookworm-slim AS runner
WORKDIR /app/services/auth
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/services/auth/node_modules ./node_modules
COPY --from=build /app/services/auth/dist ./dist
COPY --from=build /app/services/auth/prisma ./prisma
COPY --from=build /app/services/auth/package.json ./package.json
EXPOSE 3001
CMD ["npm", "run", "start"]
