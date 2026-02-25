FROM node:20-alpine

WORKDIR /app/apps/api-gateway

COPY apps/api-gateway/package.json apps/api-gateway/tsconfig.json apps/api-gateway/nest-cli.json ./
COPY apps/api-gateway/src ./src
COPY shared /app/shared

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm","run","start"]
