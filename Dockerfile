# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /build

# Build server
COPY server/package.json server/package-lock.json* server/
RUN cd server && npm install

COPY server/ server/
RUN cd server && npm run build

# Build client
COPY client/package.json client/package-lock.json* client/
RUN cd client && npm install

COPY client/ client/
RUN cd client && npm run build

# Stage 2: Runtime
FROM node:22-alpine

# Install native dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app/server

# Install production dependencies only
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev && npm rebuild better-sqlite3

# Copy built artifacts from builder stage
COPY --from=builder /build/server/dist ./dist

# Copy entrypoint script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 8099

CMD [ "/run.sh" ]
