# Coup - Online Multiplayer Card Game

An online multiplayer implementation of **Coup**, the social deduction card game where players use bluffing, deduction, and strategy to eliminate opponents and be the last one standing.

## About Coup

Coup is a fast-paced card game set in a dystopian universe where players compete for influence and power. Each player has two character cards and tries to eliminate other players by forcing them to lose their influence. Players can claim actions associated with any character, but opponents can challenge these claims. Bluffing is key!

## Project Structure

```
coup-game/
├── client/          React frontend for the game interface
├── server/          Node.js backend for game logic and WebSocket communication
├── package.json     Root workspace configuration
└── README.md        This file
```

## Installation

Install all dependencies for both client and server:

```bash
npm install
```

## Running the Application

To run both the client and server concurrently in development mode:

```bash
npm run dev
```

To run them individually:

```bash
# Run only the client
npm run dev:client

# Run only the server
npm run dev:server
```

## Technologies

- **Frontend**: React
- **Backend**: Node.js
- **Real-time Communication**: WebSockets (Socket.io)

## Game Features (Planned)

- Real-time multiplayer gameplay
- Lobby system for creating and joining games
- Character actions: Income, Foreign Aid, Coup, Tax, Assassinate, Exchange, Steal
- Challenge and block mechanics
- Player authentication
- Game state management

## Development Status

🚧 Project is currently in initial setup phase
