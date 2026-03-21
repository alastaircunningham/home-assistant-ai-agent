# Stage 1: Build
FROM node:22-alpine AS builder

# Native build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /build

# Install server deps (compiles better-sqlite3 native addon here, with network access)
COPY server/package.json server/package-lock.json* server/
RUN cd server && npm install

# Build server TypeScript (needs dev deps like tsc)
COPY server/ server/
RUN cd server && npm run build

# Prune dev dependencies after build so we can copy a lean node_modules to runtime stage
RUN cd server && npm prune --omit=dev

# Build client
COPY client/package.json client/package-lock.json* client/
RUN cd client && npm install

COPY client/ client/
RUN cd client && npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app/server

# Copy pre-built node_modules (includes compiled better-sqlite3 binary — no rebuild needed)
COPY --from=builder /build/server/node_modules ./node_modules

# Copy compiled server and static client files
COPY --from=builder /build/server/dist ./dist

# Copy entrypoint script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 8099

CMD [ "/run.sh" ]
