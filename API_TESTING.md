# API Testing Guide

This document provides examples for testing the PrepMate Chess API endpoints.

## Prerequisites

- Development server running: `npm run dev`
- Server listening on `http://localhost:3000`
- curl or Postman installed (or any HTTP client)

## Opponent Analysis API

### Endpoint
```
POST /api/opponent
```

### Test Cases

#### 1. Valid USCF ID (Sample Data)
```bash
curl -X POST http://localhost:3000/api/opponent \
  -H "Content-Type: application/json" \
  -d '{"id":"1234567"}'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "opponent": {
    "id": "1234567",
    "name": "John Doe",
    "currentRating": 1825,
    "peakRating": 1970,
    "peakDate": "July 2021",
    "ratingHistory": [
      {"year": 2018, "rating": 1420},
      {"year": 2019, "rating": 1560},
      {"year": 2020, "rating": 1600},
      {"year": 2021, "rating": 1700},
      {"year": 2022, "rating": 1970},
      {"year": 2023, "rating": 1825}
    ],
    "trend": "declining"
  }
}
```

#### 2. Valid FIDE ID (Sample Data)
```bash
curl -X POST http://localhost:3000/api/opponent \
  -H "Content-Type: application/json" \
  -d '{"id":"fide_2000000"}'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "opponent": {
    "id": "fide_2000000",
    "name": "Grandmaster Alex",
    "currentRating": 2650,
    "peakRating": 2750,
    "peakDate": "March 2023",
    "ratingHistory": [
      {"year": 2019, "rating": 2500},
      {"year": 2020, "rating": 2580},
      {"year": 2021, "rating": 2620},
      {"year": 2022, "rating": 2700},
      {"year": 2023, "rating": 2750}
    ],
    "trend": "stable"
  }
}
```

#### 3. Unknown ID (Generated Demo Data)
```bash
curl -X POST http://localhost:3000/api/opponent \
  -H "Content-Type: application/json" \
  -d '{"id":"9999999"}'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "opponent": {
    "id": "9999999",
    "name": "Player 999999",
    "currentRating": 1850,
    "peakRating": 2000,
    "peakDate": "2022-2023",
    "ratingHistory": [
      {"year": 2020, "rating": 1456},
      {"year": 2021, "rating": 1601},
      {"year": 2022, "rating": 1789},
      {"year": 2023, "rating": 1850}
    ],
    "trend": "stable"
  }
}
```

#### 4. Invalid ID (Empty/Missing)
```bash
curl -X POST http://localhost:3000/api/opponent \
  -H "Content-Type: application/json" \
  -d '{"id":""}'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": "Invalid ID provided"
}
```

### Caching Test

1. Make first request with ID `1234567`:
   - Response time: ~300ms (API call + processing)
   - Notice: `"timestamp"` in cache

2. Make second request with same ID:
   - Response time: <10ms (from cache)
   - Same data returned

3. Wait 3661 seconds (1 hour + 1 second), then request again:
   - Cache expires, API call made again
   - Response time: ~300ms

## Chess Game API

### Endpoint
```
POST /api/chess
```

### Test Workflow

#### Step 1: Create Game
```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "engineRating": 1600
  }'
```

**Response**:
```json
{
  "success": true,
  "gameId": "game_1708845123456_abc123def",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": [],
  "status": "started"
}
```

**Save the `gameId` for next steps!**

#### Step 2: Make Valid Move
Replace `[gameId]` with actual game ID from Step 1:

```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "[gameId]",
    "move": "e4"
  }'
```

**Response**:
```json
{
  "success": true,
  "userMoveValid": true,
  "userMove": "e4",
  "engineMove": "e5",
  "status": "playing",
  "inCheck": false,
  "result": null,
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
  "moves": ["e4", "e5"]
}
```

#### Step 3: Make Invalid Move
```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "[gameId]",
    "move": "a9"
  }'
```

**Response** (Invalid Move):
```json
{
  "success": false,
  "error": "Illegal move",
  "validMoves": ["a3", "a4", "b3", "b4", "c3"],
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"
}
```

#### Step 4: Continue Game Sequence
```bash
# Move 3
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "[gameId]",
    "move": "Nf3"
  }'

# Move 4
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "[gameId]",
    "move": "Nc6"
  }'
```

#### Step 5: Show Board (End Blindfold Mode)
```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "show-board",
    "gameId": "[gameId]"
  }'
```

**Response**:
```json
{
  "success": true,
  "status": "ended",
  "result": "Blindfold mode ended",
  "fen": "[current position FEN]",
  "moves": ["e4", "e5", "Nf3", "Nc6"]
}
```

#### Step 6: Resign Game
```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "resign",
    "gameId": "[gameId]"
  }'
```

**Response**:
```json
{
  "success": true,
  "status": "resigned",
  "result": "Engine won by resignation",
  "moves": ["e4", "e5", "Nf3", "Nc6"]
}
```

## Edge Cases & Error Testing

### 1. Non-existent Game ID
```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "invalid_game_id_12345",
    "move": "e4"
  }'
```

**Expected Response** (404 Not Found):
```json
{
  "error": "Game not found"
}
```

### 2. Invalid Action
```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "invalid_action",
    "gameId": "some_game"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": "Invalid action"
}
```

### 3. Different Engine Ratings

Engine behavior varies by rating:

```bash
# Beginner engine (800)
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "engineRating": 800
  }'

# Grandmaster engine (3000)
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "engineRating": 3000
  }'
```

- Lower ratings make more random moves
- Higher ratings prioritize checks and checkmates

### 4. Special Moves

#### Castling
```bash
# Setup position with O-O available
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "[gameId]",
    "move": "O-O"
  }'
```

#### En Passant
```bash
# After pawn double move enabling en passant
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "[gameId]",
    "move": "exd6"
  }'
```

#### Pawn Promotion
```bash
# Pawn reaching last rank (auto-promotes to Queen by default)
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "gameId": "[gameId]",
    "move": "a8=Q"
  }'
```

## Postman Collection Template

Create a Postman collection by importing this JSON:

```json
{
  "info": {
    "name": "PrepMate Chess API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Opponent Analysis",
      "item": [
        {
          "name": "Search USCF ID",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/opponent",
            "body": {
              "raw": "{\"id\":\"1234567\"}",
              "type": "json"
            }
          }
        }
      ]
    },
    {
      "name": "Chess Game",
      "item": [
        {
          "name": "Create Game",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/chess",
            "body": {
              "raw": "{\"action\":\"create\",\"engineRating\":1600}",
              "type": "json"
            }
          }
        }
      ]
    }
  ]
}
```

## Performance Benchmarks

### Opponent Analysis API
- First request: ~300ms (mock API simulation)
- Cached request: <10ms
- Memory per entry: ~500 bytes

### Chess API
- Create game: ~10ms
- Valid move: ~50ms
- Invalid move: ~20ms
- Game cleanup: Every 5 minutes

## Troubleshooting

### "Game not found" after successful create
- Game session expired (30 minute timeout)
- Server was restarted (in-memory storage reset)
- Wrong `gameId` provided

### Slow opponent API response
- Check if ID is already cached
- Network latency simulation adds 300ms
- Large FEN strings don't affect performance significantly

### Engine making impossible moves
- This shouldn't happen (chess.js validates all moves)
- If it does, create issue with FEN position

## Notes

- All times are approximate and depend on system performance
- Mock API response has 300ms simulated delay
- Production APIs would have real network latency
- In-memory storage means data resets on server restart
