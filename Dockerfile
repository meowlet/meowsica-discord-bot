FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist

CMD ["node", "dist/index.js"]
