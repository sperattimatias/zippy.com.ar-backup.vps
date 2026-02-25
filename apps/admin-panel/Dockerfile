FROM node:20-alpine AS deps
WORKDIR /app/apps/admin-panel
COPY apps/admin-panel/package.json apps/admin-panel/ ./
RUN npm install --omit=dev

FROM node:20-alpine AS build
WORKDIR /app/apps/admin-panel
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}
COPY apps/admin-panel/package.json apps/admin-panel/ ./
RUN npm install
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/admin-panel
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}
COPY --from=deps /app/apps/admin-panel/node_modules ./node_modules
COPY --from=build /app/apps/admin-panel/.next ./.next
RUN mkdir -p ./public
COPY --from=build /app/apps/admin-panel/package.json ./package.json
EXPOSE 3005
CMD ["npm", "run", "start"]
