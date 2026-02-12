import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

// Create socket clients
const client1 = io(SERVER_URL, { autoConnect: false });
const client2 = io(SERVER_URL, { autoConnect: false });

// Store game info
let roomCode = null;
let gameId = null;
let player1Id = null;
let player2Id = null;

async function runTest() {
    console.log("🚀 Starting Game Flow Test...");

    try {
        // 1. Connect Client 1
        await connectClient(client1, "Player 1");
        console.log("✅ Client 1 connected");

        // 2. Client 1 creates room
        const createResult = await new Promise((resolve, reject) => {
            client1.emit("createRoom", { playerName: "Alice" }, (response) => {
                if (response.success) resolve(response);
                else reject(new Error(response.error));
            });
        });

        roomCode = createResult.roomCode;
        gameId = createResult.gameId;
        player1Id = createResult.playerId;
        console.log(`✅ Room created: ${roomCode} (Game ID: ${gameId})`);

        // 3. Connect Client 2
        await connectClient(client2, "Player 2");
        console.log("✅ Client 2 connected");

        // 4. Client 2 joins room
        const joinResult = await new Promise((resolve, reject) => {
            client2.emit("joinRoom", { roomCode, playerName: "Bob" }, (response) => {
                if (response.success) resolve(response);
                else reject(new Error(response.error));
            });
        });

        player2Id = joinResult.playerId;
        console.log("✅ Client 2 joined room");

        // Setup game state listeners
        setupGameStateListener(client1, "Alice");
        setupGameStateListener(client2, "Bob");

        // 5. Start Game (Host only)
        await new Promise((resolve, reject) => {
            client1.emit("startGame", { gameId, playerId: player1Id }, (response) => {
                if (response.success) resolve();
                else reject(new Error(response.error));
            });
        });
        console.log("✅ Game started!");

        // Wait for state update to process
        await new Promise(r => setTimeout(r, 1000));

        // 6. Player 1 takes Income (Turn 1)
        console.log("\n--- Turn 1: Alice takes Income ---");
        await new Promise((resolve, reject) => {
            client1.emit("takeAction", {
                gameId,
                playerId: player1Id,
                action: "INCOME"
            }, (response) => {
                if (response.success) {
                    console.log("✅ Income action successful");
                    resolve();
                } else {
                    reject(new Error(response.error));
                }
            });
        });

        // Wait for state update
        await new Promise(r => setTimeout(r, 1000));

        console.log("\n✅ Test Completed Successfully!");

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    } finally {
        client1.disconnect();
        client2.disconnect();
        process.exit(0);
    }
}

function connectClient(socket, alias) {
    return new Promise((resolve, reject) => {
        socket.on("connect", () => resolve());
        socket.on("connect_error", (err) => reject(err));
        socket.connect();
    });
}

function setupGameStateListener(socket, playerName) {
    socket.on("gameStateUpdate", (state) => {
        // console.log(`\n📢 [${playerName}] Received Game State Update`);
        // console.log(`   Current Turn: ${state.currentPlayerId}`);
        // console.log(`   My Coins: ${state.players.find(p => p.id === state.currentPlayerId)?.coins}`);
    });
}

runTest();
