# The runner needs the Docker CLI and the host's socket mounted in.
FROM node:22-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-package-lock && npm install -g tsx
COPY src ./src
ENV NODE_ENV=production
EXPOSE 8080
CMD ["tsx", "./src/index.ts"]
