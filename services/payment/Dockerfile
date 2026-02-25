FROM node:20-alpine

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

EXPOSE 3004
CMD ["npm", "run", "start"]
