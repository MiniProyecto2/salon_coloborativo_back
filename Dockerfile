# ---------- Etapa 1: compilar TypeScript ----------
FROM node:22-alpine AS build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Etapa 2: imagen final (solo producción) ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /usr/src/app/dist ./dist

# No ejecutar como root
USER node

# Render define PORT automáticamente; en local se usa 3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/v1/health || exit 1

CMD ["node", "dist/index.js"]