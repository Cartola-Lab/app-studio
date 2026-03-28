FROM python:3.11-slim AS backend-base

WORKDIR /app/backend

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Backend deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Frontend build
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile 2>/dev/null || yarn install
COPY frontend/ .
RUN yarn build

# Final image
FROM python:3.11-slim

WORKDIR /app

# Copy backend
COPY backend/ ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy frontend build
COPY --from=backend-base /app/frontend/build ./frontend/build

# Serve frontend as static via FastAPI
RUN pip install --no-cache-dir aiofiles

EXPOSE 8001

CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8001"]
