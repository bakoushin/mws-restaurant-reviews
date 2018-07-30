# Mobile Web Specialist Certification Course Project

## Goals

This project aims to convert a static webpage to a mobile-ready web application. The main goals are to improve responsivness, accessibility and ability to work offline of Restaurant Reviews website.

## Lighthouse score

- Performance > 90
- Progressive Web App > 90
- Accessibility > 90

## Getting started

In order to run this project, you have to follow these three steps:

1.  Run backend server
2.  Build project
3.  Start project server

### 1. Run backend server

This project uses backend server for [Stage 3 of Udacity Mobile Web Specialist Nanodegree](https://github.com/udacity/mws-restaurant-stage-3). You have to download and run this server according to its documentation.

### 2. Build project

This project uses webpack for making production bundle. In order to build project, run following commands:

```
npm install

npm run build
```

The resulting bundle is in `dist` directory within project path.

### 3. Start project server

This project doesn't require any specific server. It can be run on any HTTP server of choice.

For example, you can use Python HTTP server, which is included by default in MacOS and many Linux distributions. The exact command depends on which version of Python you have (use `python -V` in a terminal to check out).

**Python 2.x**

```
python -m SimpleHTTPServer 8000
```

**Python 3.x**

```
python3 -m http.server 8000
```

The server must be started in `dist` directory.

In the examples above, the server will run on `http://localhost:8000`.

## Image credits

List of images used in this project:

- Heart by Hassan ali from the Noun Project
- Restaurant by b farias from the Noun Project
