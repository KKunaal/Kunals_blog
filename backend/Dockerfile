# Multi-stage Docker build for Kunals Blog backend (Go + SQLite)

# --- Builder stage ---
ARG GO_VERSION=1.24.5
FROM golang:${GO_VERSION}-bookworm AS builder

WORKDIR /app

# Install build dependencies for CGO (required by mattn/go-sqlite3)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Ensure the requested toolchain is used (and do not try to auto-downgrade)
ENV GOTOOLCHAIN=local

# Copy module files and download deps first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the backend source
COPY . .

# Build the binary (keep CGO enabled for sqlite)
RUN go build -o /app/server .

# Pre-create runtime dirs we need in final image (distroless has no shell)
RUN mkdir -p /runtime/data /runtime/uploads


# --- Runtime stage ---
FROM gcr.io/distroless/cc-debian12:nonroot

WORKDIR /app

# Copy compiled binary
COPY --from=builder /app/server /app/server
COPY --from=builder --chown=nonroot:nonroot /runtime/data /data
COPY --from=builder --chown=nonroot:nonroot /runtime/uploads /app/uploads

# Default config via env vars (can override at runtime)
ENV PORT=8080 \
    DB_PATH=/data/blog.db \
    UPLOAD_PATH=/app/uploads \
    JWT_SECRET=change-me \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=admin123

EXPOSE 8080

# Persist database and uploads outside container FS
VOLUME ["/data", "/app/uploads"]

ENTRYPOINT ["/app/server"]

