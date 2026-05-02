# Phase 2 Enhancements Plan: Resilience, Mobile Layout, and Communication

This document outlines the detailed step-by-step implementation plan for upgrading the Coup App across three major areas: Session Recovery (Reconnection), Mobile-First Responsiveness, and Communication (Chat & Logs).

---

## 3. Resilience & Session Recovery (Reconnection)
**Goal:** If a player refreshes their browser or loses internet momentarily during an active game, they should be able to rejoin seamlessly without breaking the game state.

### Backend Checklist:
- [ ] **Update `server/managers/GameManager.js`:**
  - Create a new `reconnectPlayerToGame(gameId, playerId, socketId)` method.
  - Bypass the `status !== 'LOBBY'` check if the `playerId` exists in the game.
  - Update the player's old `socketId` to the new one.
- [ ] **Update `server/models/Game.js`:**
  - Add `isConnected` boolean to the `Player` model (default `true`).
  - When a socket disconnects, mark `isConnected = false` instead of immediately removing them from the game if the game is already `ACTIVE`.
- [ ] **Update `server/server.js` (Socket Events):**
  - Listen for a new `reconnect` event.
  - On `disconnect`, wait a specific timeout (or indefinitely until game ends) before formally "eliminating" a disconnected player.
  - Upon successful `reconnect`, emit the full `gameStateUpdate` back to the reconnected socket.

### Frontend Checklist:
- [ ] **Update `client/src/App.jsx` & `store/gameStore.js`:**
  - On initial App load, check `localStorage` for `coup_session` (which is already saved by `saveSession`).
  - If a session exists, automatically emit `reconnect` to the server with `gameId` and `playerId`.
  - Handle `reconnectSuccess`: Update zustand state and navigate directly to `/game`.
  - Handle `reconnectFailed`: Clear `localStorage` and keep them on the lobby screen.

---

## 4. Mobile-First Layout
**Goal:** The `GameBoard` must be playable with one hand (thumb) on a vertical mobile screen, as most casual players use their phones in the living room.

### Structure & CSS Checklist:
- [ ] **CSS Media Queries (`index.css` / Component CSS):**
  - Implement a mobile breakpoint (e.g., `@media (max-width: 768px)`).
- [ ] **Layout Restructuring (`GameBoard.jsx`):**
  - **Top Menu (Mobile):** Render a small, horizontal scrollable list of opponents. Only show their names, hidden card counts, and coins.
  - **Middle Section (Mobile):** The "Arena", displaying the Game Log, the Treasury, and any active `ChallengePanel` overlays.
  - **Bottom Fixed Menu (Mobile):** Pin the active user's cards and the `ActionButtons` tightly to the bottom of the screen (`position: fixed; bottom: 0;`), making them easily accessible by thumbs.
- [ ] **Action Buttons (`ActionButtons.jsx`):**
  - Change grid layouts to simple flex rows. Make icons/text large enough (min 44px) so they are easy to tap without fat-fingering.

---

## 5. Communication & Clarity (Action Logs & Chat)
**Goal:** Players need absolute clarity on what is happening in the fast-paced game. Adding a chat brings life to the lobby.

### Chat Implementation Checklist:
- [ ] **Backend (`server/server.js`):**
  - Listen for `sendChatMessage` event (carrying `playerId`, `playerName`, `message`, `roomCode`).
  - Broadcast `chatMessage` to everyone in `roomCode`.
- [ ] **Frontend (`client/src/store/gameStore.js`):**
  - Add `chatMessages: []` to the state.
  - Listen for the `chatMessage` socket event and append to `chatMessages`.
- [ ] **Frontend (`client/src/components/ChatBox.jsx`):**
  - Create a new component `ChatBox`.
  - Place it in `Lobby` and as a sidebar/tab inside `GameBoard`.

### Enhanced Game Log Checklist:
- [ ] **Frontend (`client/src/components/GameLog.jsx`):**
  - Restructure the log entries to use Rich Text rather than simple string arrays.
  - **Color Coding Engine:**
    - Green = Positive actions (Income, Foreign Aid, gaining coins).
    - Red = Hostile actions (Assassinate, Coup, stealing).
    - Warning/Yellow = Challenges & Blocks.
  - **Auto-scroll:** Ensure the log always auto-scrolls smoothly to the newest action using a `useRef` pointing to the bottom element.
