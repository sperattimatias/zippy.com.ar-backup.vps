FROM node:20-alpine AS deps
WORKDIR /app/apps/api-gateway
COPY apps/api-gateway/package.json apps/api-gateway/tsconfig.json apps/api-gateway/nest-cli.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS build
WORKDIR /app/apps/api-gateway
COPY apps/api-gateway/package.json apps/api-gateway/tsconfig.json apps/api-gateway/nest-cli.json ./
COPY apps/api-gateway/src ./src
COPY shared /app/shared
RUN npm install
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/api-gateway
ENV NODE_ENV=production
COPY --from=deps /app/apps/api-gateway/node_modules ./node_modules
COPY --from=build /app/apps/api-gateway/dist ./dist
COPY --from=build /app/apps/api-gateway/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
