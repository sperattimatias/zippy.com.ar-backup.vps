FROM node:20-alpine

WORKDIR /app/services/driver

COPY services/driver/package.json services/driver/tsconfig.json services/driver/nest-cli.json services/driver/jest.config.js ./
COPY services/driver/prisma ./prisma
COPY services/driver/src ./src
COPY shared /app/shared

RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3003
CMD ["npm", "run", "start"]
