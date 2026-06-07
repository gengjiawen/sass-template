FROM node:lts
RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN cp .env.example .env && pnpm install --frozen-lockfile && rm .env
ENV NODE_ENV=production
RUN cp .env.example .env && pnpm run build && rm .env

EXPOSE 3000
CMD ["sh", "-c", "cp .env.example .env && exec pnpm run --filter web start"]
