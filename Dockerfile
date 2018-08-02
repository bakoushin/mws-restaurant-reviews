FROM timbru31/node-alpine-git

RUN npm install pm2 -g

# Sever

WORKDIR /usr/src/backend

RUN git clone https://github.com/bakoushin/mws-restaurant-stage-3.git .
RUN npm install sails -g
RUN npm install

# Client

WORKDIR /usr/src/frontend

COPY img ./img
COPY src ./src
COPY package.json .
COPY postcss.config.js .
COPY webpack.config.js .
COPY server.js .

RUN npm install node-sass@latest
RUN npm install
RUN npm run build

# PM2

WORKDIR /usr/src/app

COPY process.yml .

CMD ["pm2-runtime", "process.yml"]
