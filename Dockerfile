# 自架版（adapter-node）。資料持久化請掛載 volume 到 /app/data 與 /app/static。
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/static ./static
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "build/index.js"]
