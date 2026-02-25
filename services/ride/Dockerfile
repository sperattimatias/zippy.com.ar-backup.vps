FROM node:20-alpine AS deps
WORKDIR /app/services/ride
RUN apk add --no-cache openssl libc6-compat openssl1.1-compat || apk add --no-cache openssl libc6-compat
COPY services/ride/package.json services/ride/tsconfig.json services/ride/nest-cli.json services/ride/jest.config.js ./
COPY services/ride/prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate

FROM node:20-alpine AS build
WORKDIR /app/services/ride
RUN apk add --no-cache openssl libc6-compat openssl1.1-compat || apk add --no-cache openssl libc6-compat
COPY services/ride/package.json services/ride/tsconfig.json services/ride/nest-cli.json services/ride/jest.config.js ./
COPY services/ride/prisma ./prisma
COPY services/ride/src ./src
COPY shared /app/shared
RUN npm install
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/services/ride
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat openssl1.1-compat || apk add --no-cache openssl libc6-compat
COPY --from=deps /app/services/ride/node_modules ./node_modules
COPY --from=build /app/services/ride/dist ./dist
COPY --from=build /app/services/ride/prisma ./prisma
COPY --from=build /app/services/ride/package.json ./package.json
EXPOSE 3002
CMD ["npm", "run", "start"]
