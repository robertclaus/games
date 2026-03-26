# Stage 0: Build the lobby (top-level landing page)
FROM node:20-alpine AS lobby-builder
WORKDIR /app/games/lobby

COPY games/lobby/package*.json ./
RUN npm install

COPY games/lobby/ ./
RUN npm run build

# Stage 1: Build the Arboretum game
FROM node:20-alpine AS arboretum-builder
WORKDIR /app/games/arboretum

RUN mkdir -p /app/server/public/arboretum

COPY games/arboretum/package*.json ./
RUN npm install

COPY games/arboretum/ ./
RUN npm run build

# Stage 2: Build the Nerts game
FROM node:20-alpine AS nerts-builder
WORKDIR /app/games/nerts

RUN mkdir -p /app/server/public/nerts

COPY games/nerts/package*.json ./
RUN npm install

COPY games/nerts/ ./
RUN npm run build

# Stage 3: Build the Spyouts game
FROM node:20-alpine AS spyouts-builder
WORKDIR /app/games/spyouts

RUN mkdir -p /app/server/public/spyouts

COPY games/spyouts/package*.json ./
RUN npm install

COPY games/spyouts/ ./
RUN npm run build

# Stage 4: Build the Dead of Winter game
FROM node:20-alpine AS dead-of-winter-builder
WORKDIR /app/games/dead-of-winter

RUN mkdir -p /app/server/public/dead-of-winter

COPY games/dead-of-winter/package*.json ./
RUN npm install

COPY games/dead-of-winter/ ./
RUN npm run build

# Stage 5: Build the Otter game
FROM node:20-alpine AS otter-builder
WORKDIR /app/games/otter

RUN mkdir -p /app/server/public/otter

COPY games/otter/package*.json ./
RUN npm install

COPY games/otter/ ./
RUN npm run build

# Stage 6: Build the Geistesblitz game
FROM node:20-alpine AS geistesblitz-builder
WORKDIR /app/games/geistesblitz

RUN mkdir -p /app/server/public/geistesblitz

COPY games/geistesblitz/package*.json ./
RUN npm install

COPY games/geistesblitz/ ./
RUN npm run build

# Stage 7: Build the Paperback game
FROM node:20-alpine AS paperback-builder
WORKDIR /app/games/paperback

RUN mkdir -p /app/server/public/paperback

COPY games/paperback/package*.json ./
RUN npm install

COPY games/paperback/ ./
RUN npm run build

# Stage 8: Build the Word Slam game
FROM node:20-alpine AS word-slam-builder
WORKDIR /app/games/word-slam

RUN mkdir -p /app/server/public/word-slam

COPY games/word-slam/package*.json ./
RUN npm install

COPY games/word-slam/ ./
RUN npm run build

# Stage 9: Build the Blokus game
FROM node:20-alpine AS blokus-builder
WORKDIR /app/games/blokus

RUN mkdir -p /app/server/public/blokus

COPY games/blokus/package*.json ./
RUN npm install

COPY games/blokus/ ./
RUN npm run build

# Stage 10: Build the Telestrations game
FROM node:20-alpine AS telestrations-builder
WORKDIR /app/games/telestrations

RUN mkdir -p /app/server/public/telestrations

COPY games/telestrations/package*.json ./
RUN npm install

COPY games/telestrations/ ./
RUN npm run build

# Stage 11: Build the docs
FROM python:3.12-alpine AS docs-builder
WORKDIR /docs

RUN pip install --no-cache-dir mkdocs-material

COPY docs/ ./
RUN mkdocs build

# Stage 9: Build the server
FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm install

COPY server/ ./
RUN npm run build

# Stage 10: Production runtime
FROM node:20-alpine AS production
WORKDIR /app

# Copy server package.json and install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy compiled server
COPY --from=server-builder /app/server/dist ./dist

# Copy game static files (lobby first, then games on top — lobby goes to root)
COPY --from=lobby-builder /app/server/public ./public
COPY --from=arboretum-builder /app/server/public ./public
COPY --from=spyouts-builder /app/server/public ./public
COPY --from=nerts-builder /app/server/public ./public
COPY --from=dead-of-winter-builder /app/server/public ./public
COPY --from=otter-builder /app/server/public ./public
COPY --from=geistesblitz-builder /app/server/public ./public
COPY --from=paperback-builder /app/server/public ./public
COPY --from=word-slam-builder /app/server/public ./public
COPY --from=blokus-builder /app/server/public ./public
COPY --from=telestrations-builder /app/server/public ./public
COPY --from=docs-builder /docs/site ./public/docs

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
