FROM node:20-alpine AS deps
WORKDIR /app/services/driver
COPY services/driver/package.json services/driver/tsconfig.json services/driver/nest-cli.json services/driver/jest.config.js ./
COPY services/driver/prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate

FROM node:20-alpine AS build
WORKDIR /app/services/driver
COPY services/driver/package.json services/driver/tsconfig.json services/driver/nest-cli.json services/driver/jest.config.js ./
COPY services/driver/prisma ./prisma
COPY services/driver/src ./src
COPY shared /app/shared
RUN npm install
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/services/driver
ENV NODE_ENV=production
COPY --from=deps /app/services/driver/node_modules ./node_modules
COPY --from=build /app/services/driver/dist ./dist
COPY --from=build /app/services/driver/prisma ./prisma
COPY --from=build /app/services/driver/package.json ./package.json
EXPOSE 3003
CMD ["npm", "run", "start"]
