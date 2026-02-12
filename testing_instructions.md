# Manual Testing Instructions for Coup Game

Due to local environment limitations preventing automated script execution, please follow these steps to manually verify the game flow.

## 1. Environment Setup
Ensure Node.js is installed and accessible in your terminal.
- Open a terminal and check: `node --version` and `npm --version`.
- If these commands fail, you may need to add Node.js to your system PATH or use a different terminal (e.g., Git Bash, Command Prompt vs PowerShell).

## 2. Start the Backend Server
1. Open a terminal window (Terminal 1).
2. Navigate to the server directory:
   ```bash
   cd e:\Builds\Coup\server
   ```
3. Install dependencies (if not already done):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   *Expected Output:* `Server running on port 3001`

## 3. Start the Frontend Client
1. Open a **new** terminal window (Terminal 2).
2. Navigate to the client directory:
   ```bash
   cd e:\Builds\Coup\client
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *Expected Output:* URL like `http://localhost:5173/`

## 4. Test Scenarios

### Scenario A: Basic Game Flow (2 Players)
1. **Open Browser Window 1 (Host - Alice)**
   - Go to `http://localhost:5173/` (or the URL fro step 3).
   - Enter Name: "Alice".
   - Click "Create Room".
   - *Verify:* You see a Lobby screen with a Room Code (e.g., ABCD).

2. **Open Incognito Window / Different Browser (Client - Bob)**
   - Go to the same URL.
   - Enter Name: "Bob".
   - Enter Room Code: "ABCD" (from Alice's screen).
   - Click "Join Room".
   - *Verify:* Both screens update to show Alice and Bob in the player list.

3. **Start Game**
   - On Alice's screen (Host), click "Start Game".
   - *Verify:* Both screens transition to the Game Board.
   - *Verify:* Each player sees:
     - Their own hand (2 cards).
     - Opponent's card count (2 hidden).
     - Coins: 2.
     - Influence: 2.

4. **Turn 1: Income**
   - Identify whose turn it is (highlighted or text prompt). Let's say it's Alice.
   - On Alice's screen: Click "Income".
   - *Verify:*
     - Alice's coins increase to 3.
     - Game Log updates: "Alice used Income".
     - Turn passes to Bob.

5. **Turn 2: Foreign Aid**
   - On Bob's screen: Click "Foreign Aid".
   - *Verify:* Block window appears for Alice (since Duke can block).
   - On Alice's screen: Click "Pass".
   - *Verify:* Bob's coins increase by 2 (Total: 4). Turn passes back to Alice.

### Scenario B: Challenge Mechanic
1. **Turn 3: Tax (Bluff or Truth)**
   - On Alice's screen: Click "Tax" (+3 coins).
   - *Verify:* Challenge window appears for Bob.
   - On Bob's screen: Click "Challenge".
   - *Result 1 (Alice has Duke):*
     - Alice reveals Duke -> Bob loses influence (must select card to reveal/discard).
     - Alice draws new card (Exchange blocked/shuffled?). No, just reveals and reshuffles if valid.
     - Turn ends.
   - *Result 2 (Alice bluffs):*
     - Alice reveals non-Duke -> Alice loses influence (card flipped).
     - Turn ends.

### Scenario C: Coup
1. Play until one player has 7+ coins.
2. On that player's turn: Click "Coup".
3. Select opponent as target.
4. Opponent must choose a card to lose/reveal.
5. *Verify:* Opponent loses 1 influence. Coins deducted.

## 5. Troubleshooting
- If "Socket connection failed": Ensure server is running on port 3001.
- If UI glitches: Check browser console (F12) for errors.
