FROM node:20-alpine AS deps
WORKDIR /app/services/payment
COPY services/payment/package.json \
     services/payment/tsconfig.json \
     services/payment/tsconfig.build.json \
     services/payment/nest-cli.json \
     ./
COPY services/payment/prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate

FROM node:20-alpine AS build
WORKDIR /app/services/payment
COPY services/payment/package.json \
     services/payment/tsconfig.json \
     services/payment/tsconfig.build.json \
     services/payment/nest-cli.json \
     ./
COPY services/payment/prisma ./prisma
COPY services/payment/src ./src
COPY shared /app/shared
RUN npm install
RUN if [ -f "./prisma/schema.prisma" ]; then npx prisma generate; fi
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/services/payment
ENV NODE_ENV=production
COPY --from=deps /app/services/payment/node_modules ./node_modules
COPY --from=build /app/services/payment/dist ./dist
COPY --from=build /app/services/payment/prisma ./prisma
COPY --from=build /app/services/payment/package.json ./package.json
EXPOSE 3004
CMD ["npm", "run", "start"]
