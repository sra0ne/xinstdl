
FROM node:18-alpine


WORKDIR /usr/src/app


RUN apk add --no-cache python3


COPY package*.json ./


RUN npm install


COPY . .


CMD [ "node", "bot.js" ]