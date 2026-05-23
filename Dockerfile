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
RUN pnpm install --frozen-lockfile
ENV NODE_ENV=production
RUN pnpm run build

EXPOSE 3000
CMD ["pnpm", "run", "--filter", "web", "start"]
