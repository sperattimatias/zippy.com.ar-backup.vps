FROM node:20-alpine

WORKDIR /app/apps/admin-panel

# build-time arg para Next (necesario en `next build`)
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}

COPY apps/admin-panel/package.json apps/admin-panel/ ./

RUN npm install
RUN npm run build

EXPOSE 3005
CMD ["npm", "run", "start"]
