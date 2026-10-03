FROM node:22-slim AS client-build
WORKDIR /build
RUN npm install --global pnpm@11.19.0
COPY tools/web-build/package.json tools/web-build/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY client ./client
COPY tools/build-client.js tools/mobile-network-policy.js ./tools/
RUN node tools/build-client.js

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 GRIDSHARD_CLIENT_DIR=/app/client
COPY server/requirements.txt /app/server/requirements.txt
RUN pip install --no-cache-dir -r /app/server/requirements.txt
COPY server/app /app/server/app
COPY server/migrations /app/server/migrations
COPY server/json_migrations /app/server/json_migrations
COPY server/data/arena_bot_profiles_v1.json server/data/arena_progression_v1.json /app/server/data/
COPY --from=client-build /build/dist /app/client
RUN groupadd --gid 10001 gridshard && useradd --uid 10001 --gid 10001 --no-create-home gridshard \
    && mkdir -p /var/lib/gridshard && chown gridshard:gridshard /var/lib/gridshard
USER 10001:10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "server.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-proxy-headers", "--no-access-log"]
