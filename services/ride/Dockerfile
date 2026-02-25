FROM node:20-alpine

WORKDIR /app/services/ride

COPY services/ride/package.json services/ride/tsconfig.json services/ride/nest-cli.json services/ride/jest.config.js ./
COPY services/ride/prisma ./prisma
COPY services/ride/src ./src
COPY shared /app/shared

RUN apk add --no-cache openssl libc6-compat openssl1.1-compat || apk add --no-cache openssl libc6-compat

RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3002
CMD ["npm", "run", "start"]
