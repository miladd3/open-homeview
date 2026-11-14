# One image, one process: the Node server serves the built page, kiosk.yaml and
# the Home Assistant auth proxy (server/app.ts).
#
# The build stages run on the build machine's own platform: the page is plain
# files and the server's dependencies are plain JavaScript, so an arm64 image
# doesn't need a slow emulated npm install.

# ---- build the page ----
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# `build` type-checks before bundling, so a type error fails the image build.
RUN npm run build

# ---- server dependencies only ----
FROM --platform=$BUILDPLATFORM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---- runtime ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    CONFIG_PATH=/config/kiosk.yaml
COPY --from=deps /app/node_modules ./node_modules
COPY package.json kiosk.example.yaml kiosk.schema.json ./
COPY server ./server
COPY --from=build /app/dist ./dist

USER node
EXPOSE 8080
VOLUME /config
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
# Node 24 runs the TypeScript directly (type stripping).
CMD ["node", "server/main.ts"]
