FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npm install -g serve

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npx vite build --mode production

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]