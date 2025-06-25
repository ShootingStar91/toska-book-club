FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npm install -g serve

COPY . .

RUN npx vite build

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
