# FeelShareLove : image du serveur. Dans Coolify : Build Pack = Dockerfile,
# Base Directory = /  et  Dockerfile Location = /server/Dockerfile  (comme pour SOLAR).
FROM node:22-alpine
WORKDIR /srv
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/server.js ./
COPY app ./public
ENV PORT=8080 PUBLIC_DIR=/srv/public
EXPOSE 8080
CMD ["node", "server.js"]
