# Multi-stage Docker build for Kunals Blog backend (Go + SQLite)

# --- Builder stage ---
ARG GO_VERSION=1.24.5
FROM golang:${GO_VERSION}-bookworm AS builder

WORKDIR /app

# Enable CGO (needed for sqlite). Architecture will follow the image/platform.
ENV CGO_ENABLED=1

# Install build dependencies for CGO (required by mattn/go-sqlite3)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

# Allow Go to auto-select correct toolchain if needed
ENV GOTOOLCHAIN=auto

# Copy module files and download deps first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the backend source
COPY . .

# Ensure module graph matches imports (fetch any missing deps)
RUN go mod tidy

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
    DATABASE_URL= \
    UPLOAD_PATH=/app/uploads \
    JWT_SECRET=change-me \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=admin123

EXPOSE 8080

# Persist database and uploads outside container FS
VOLUME ["/data", "/app/uploads"]

ENTRYPOINT ["/app/server"]

