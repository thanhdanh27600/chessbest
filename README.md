![ChessBest Icon](https://raw.githubusercontent.com/thanhdanh27600/chessbest/main/public/assets/ext-icon.png)

# Chessbest
A chess.com extension for finding the best moves and evaluating your live game.

![ChessBest Demo](https://gist.githubusercontent.com/thanhdanh27600/2186c00731e3851de686eddf48c76b90/raw/40be88df956c49ba9e7431fbd035b85b7008992f/gif-1.gif)

![ChessBest Popup](https://gist.githubusercontent.com/thanhdanh27600/2186c00731e3851de686eddf48c76b90/raw/40be88df956c49ba9e7431fbd035b85b7008992f/img-1.png)

## Features

- You'll host your chess server and you'll run your Stockfish engine.
- Marking the best move and update evaluation bar for each move.
- You will move the pieces yourself (or chess.com will take notice).
- Client-side does not involve any chess engine (or chess.com will take notice).
- For the purpose of improving chess skills only!

## Installation (Client-side)

1. Clone the repo or [download the latest release](https://github.com/thanhdanh27600/chessbest/releases).
2. Go to `chrome://extensions` in a new tab or use the Manage extensions page.
3. Enable `Developer mode`, then click `Load unpacked` and select root folder (containing `manifest.json`).

*Note: if you cloned the repo, select the `dist` folder.*


*If you get stuck, refer to [Chrome's instructions](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked)*.

## How to build (Client-side)

1. Clone the repo.
2. Install dependencies, run `npm install` or `yarn`.
3. Build the extension to `dist` folder by `npm run build` or `yarn build`.

## Installation (Server-side)
*To be updated*

## Usage

1. Start a classic game (or puzzle) on chess.com.
2. Chessbest will automatically run.
3. The chess engine's status can be seen on the extension icon (popup).
4. You may need to make one move to see the response.

## Support

If you need assistance or have any questions, please reach me out in the `Issues` section.
