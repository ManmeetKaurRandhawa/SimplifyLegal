FROM node:22-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --include=dev

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY frontend ./frontend
COPY backend ./backend

RUN cd frontend && npm run build

ENV NODE_ENV=production

CMD ["npm", "start", "--prefix", "backend"]
