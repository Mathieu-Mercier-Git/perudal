# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Perudal is an online board game where players create/join a game lobby ("game code") and play together. It is built on the [Plume](https://github.com/Coreoz/Plume) stack:
- **Backend**: Java 17, Maven, Jersey (REST), Guice (DI), Grizzly (HTTP server + WebSocket)
- **Frontend**: `admin-ui/`, React + TypeScript, built with [create-plume-react-project](https://github.com/Coreoz/create-plume-react-project) conventions (Plume TS DI, micro-observables for state, MUI)
- Backend and frontend communicate through a mix of **REST API calls** (game lifecycle actions) and **raw WebSocket** (real-time lobby/game state broadcast)

## Commands

### Backend (Java, root directory)
- Run the server: run `jar.WebApplication` main class (or `mvn compile exec:java -Dexec.mainClass=jar.WebApplication`), then open <http://localhost:8080>
- Build/package: `mvn package` (produces `target/dist/perudal` via the `play2-maven-plugin` dist-exploded goal)
- Run tests: `mvn test`
- Run a single test: `mvn test -Dtest=ClassName#methodName`
- Regenerate QueryDSL DB classes (in `src/main/java/jar/db/generated`): run `jar.db.QuerydslGenerator.main()`
- Config file: `src/main/resources/application.conf`
- Swagger UI (Basic auth via `internal-api.auth-username`/`auth-password` in config): <http://localhost:8080/webjars/swagger-ui/4.1.2/index.html?url=/api/swagger>
- Monitoring endpoints (Basic auth protected): `/api/monitoring/info`, `/api/monitoring/health`, `/api/monitoring/metrics`

### Frontend (`admin-ui/`)
Yarn is required (v3.6.4, node ~18).
- Install deps: `yarn install`
- Dev server: `yarn start` (proxies `/api` to `http://localhost:8080`, app on <http://localhost:3000>); if first compile fails, reload the browser or force it with `yarn build`
- Build: `yarn build`
- Lint: `yarn eslint` (TS/TSX, Airbnb rules) and `yarn stylelint` (SCSS)
- Type-check only: `yarn typescript`
- Tests: `yarn test` (Jest) — run a single test file with `yarn test path/to/File.test.tsx`
- Coverage: `yarn coverage`

## Architecture

### Backend structure (`src/main/java/jar/`)
- `WebApplication.java`: entry point, wires Grizzly HTTP server
- `guice/ApplicationModule.java`: Guice DI bindings
- `jersey/`: Jersey/Grizzly HTTP setup, logging filter, Swagger config provider
- `webservices/api/`: public REST endpoints (`GameWs` at `/game` — create/join/quit/cancel game). `webservices/internal/`: Swagger + monitoring endpoints (Basic-auth protected)
- `services/game/`: game domain logic
  - `GameService`: in-memory game state, keyed by `gameCode` (`Map<String, Game>`), each `Game` holds `Map<UUID socketId, Player>`. Players are identified by their **WebSocket connection UUID**, not a persisted user id — refreshing the page currently loses the connection (see TODO in `GameService`)
  - `beans/`: request/response DTOs (`NewGame`, `JoinGame`, `ActionGame`, `Lobby`, `Player`, `Game`)
- `services/socket/`: WebSocket plumbing
  - `WebSocketApp` / its inner `WebSocketListenerApp`: Grizzly `WebSocketApplication`, handles raw socket connect/close (client → server text messages over the socket are currently unused/dead code — see the commented-out `onMessage` handling and matching commented logic in `SocketService`)
  - `SocketService`: tracks socket-to-game membership (`socketsByGame`, `socketById`, `IdAndGameCodebySocket`) and **broadcasts** server-originated events (`ServerEvent.UPDATED_LOBBY`, `CANCEL_GAME`) as JSON (`SocketResponse`) to all sockets in a game room. Invoked by `GameService` after each REST action mutates state — this is the actual real-time push mechanism (not the client→server socket messages)
  - `enums/ClientEvent`, `enums/ServerEvent`: event name constants (client-side events are currently unused given the REST-driven flow above)
- `services/utils/ParserService`: JSON (de)serialization helper used for socket payloads
- `db/`: QueryDSL-generated DB classes (`generated/`, git-ignored/regenerated, do not hand-edit) and `DatabaseInitializer`

**Request flow pattern**: the frontend calls a REST endpoint (e.g. `POST /game`) to mutate game state; the backend service (e.g. `GameService`) updates its in-memory map and then calls `SocketService` to broadcast the updated `Lobby`/event to every WebSocket connected to that game room. All *other* players receive the update via the WebSocket push; the *initiating* player gets the result via the REST response.

### Frontend structure (`admin-ui/src/`)
Follows Plume-TS conventions — see `admin-ui/README.md` for the full rationale. Key points specific to this project:
- `services/socket/SocketEngineService.ts`: owns the raw `WebSocket` instance (connects to `ws://localhost:8080/socket`), exposes `initSocket`, `getSocket`/`getIdSocket` (the server assigns a socket UUID on connect, sent as `id:<uuid>` and captured here), and a `socketListener` helper to filter incoming `SocketResponse` events by `event` name. `createGame`/`joinGame`/`quitGame`/`cancelGame` exported here send raw text frames but are legacy/unused now that the equivalent actions go through `GameApi` (REST) — the socket is used to *receive* broadcasts, not send actions
- `api/game/GameApi.ts`: REST calls to `/game` (create/join/quit/cancel), mirrors `GameWs.java`
- `services/game/GameService.ts`: business/state layer for game/lobby; holds `lobby` and `isMainPlayer` as `micro-observables`, calls `GameApi` and updates local observable state from the REST response. `userSocketId` (from `SocketEngineService.getIdSocket()`) is sent with every game API call so the backend can associate the REST actor with their WebSocket connection
- Dependency injection: services/APIs are registered in `services/services-module.ts` / `api/api-module.ts` / `components/components-module.ts` via `plume-ts-di`, consumed with hooks from `lib/react-hooks-alias`
- `components/pages/lobby/Lobby.tsx`, `components/pages/home/Home.tsx`: the create/join/lobby game screens
- `lib/`: vendored Plume TS helpers (form errors, HTTP loader hooks, notifications, etc.) — treat as third-party, prefer not to modify
- SCSS: CSS Modules per-component (`<Component>.module.scss`), see `admin-ui/README.md` "CSS Modules" section for conventions
