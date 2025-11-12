# SIA Challenge 2025

A client-server application built with Express, WebSocket, and AlpineJS for real-time coordination between clients.

## Features

- Express.js server
- WebSocket support for real-time communication
- AlpineJS for reactive UI
- ES6+ codebase with Babel transpilation to ES5
- ESLint configuration for code quality
- Vitest testing framework

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Building for Production

Transpile ES6+ code to ES5:

```bash
npm run build
```

The transpiled code will be in the `dist/` directory.

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Linting

Check code quality:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

## Project Structure

```
sia_challenge_2025/
├── src/
│   ├── __tests__/
│   │   └── server.test.js
│   └── server.js
├── public/
│   └── index.html
├── dist/              # Transpiled ES5 code (generated)
├── coverage/          # Test coverage (generated)
├── babel.config.js
├── vitest.config.js
├── .eslintrc.json
├── package.json
└── README.md
```

## Scripts

- `npm start` - Start the development server (from src/)
- `npm run start:prod` - Start the production server (from dist/)
- `npm run dev` - Start development server with watch mode
- `npm run build` - Transpile ES6+ to ES5
- `npm run build:watch` - Transpile with watch mode
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## Deployment

To deploy on Render.com or other platforms, see [DEPLOY.md](./DEPLOY.md) for detailed instructions.

## Technologies

- **Express** - Web framework
- **ws** - WebSocket library
- **AlpineJS** - Lightweight reactive framework
- **Babel** - JavaScript compiler (ES6+ to ES5)
- **ESLint** - Code linting
- **Vitest** - Testing framework

