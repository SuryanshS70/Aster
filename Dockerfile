# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
RUN groupadd --system aster && useradd --system --gid aster --home-dir /app aster
COPY --from=build --chown=aster:aster /app/.output ./.output
USER aster
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
