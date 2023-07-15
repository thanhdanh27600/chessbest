(() => {
	let currentGameId = "";
	window.dolph = {};
	const dbDoc = "fens/dolph";
	const {firebase} = require("./firebase");

	const writeUserData = (fen) => {
		console.log("dolph: writing...", fen);
		firebase.set(firebase.ref(firebase.db, dbDoc), {
			fen,
		});
	};
	const listener = (fn) => onValue(ref(db, dbDoc), fn);

	const newGameLoaded = () => {
		const loopAndAction = setInterval(() => {
			const board = document.getElementsByTagName("chess-board")[0];
			if (!board) {
				console.log("dolph: Not found Board");
				return;
			}
			clearInterval(loopAndAction);
			const game = board.game;
			window.dolph.game = game;
			initEvaluate();
			if (!writeUserData) {
				console.log("dolph: Not found writeUserData");
				return;
			}
			writeUserData(game.getFEN()); // get hint on first load
			// check new move and write
			game.on("Move", ({data}) => {
				const curFen = data.move.fen;
				console.log("curFen", curFen);
				writeUserData(curFen);
			});
			game.on("Load", ({data}) => {
				const curFen = data.move?.fen;
				if (curFen) {
					console.log("curFen", curFen);
					writeUserData(curFen);
				}
				initEvaluate();
			});
			// get hint and mark loop
			const intervalMark = setInterval(() => {
				if (!window.dolph.hint) {
					console.log("dolph: Not found hint");
					return;
				}
				mark(window.dolph.hint);
			}, 200);
			// clear mark loop
			const intervalUnmark = setInterval(() => {
				game.markings.removeAll();
			}, 400);

			const mark = (next) => {
				if (!next) return;
				if (next.lenght < 4) return;
				const from = `${next[0]}${next[1]}`;
				const to = `${next[2]}${next[3]}`;
				game.markings.addOne({
					data: {
						opacity: 0.8,
						from,
						to,
					},
					type: "arrow",
				});
			};

			if (!listener) {
				console.log("dolph: Not found listener");
				return;
			}
			listener((snapshot) => {
				const data = snapshot.val();
				console.log("dolph: Received", data);
				window.dolph.evaluationType = data.evaluationType;
				window.dolph.evaluationValue = data.evaluationValue;
				setTimeout(updateEvaluate);
				mark(data.hint);
				window.dolph.hint = data.hint;
			});

			window.dolph.clearAll = () => {
				clearInterval(intervalMark);
				clearInterval(intervalUnmark);
				game.markings.removeAll();
				window.dolph.off(window.dolph.ref(window.dolph.db, dbDoc), "value");
				game.on("Move", ({data}) => {});
				console.log("dolph: success");
			};
		}, 500);
	};

	const initEvaluate = () => {
		const evaluationBoard = document.getElementById("board-layout-evaluation");
		evaluationBoard.innerHTML = `<evaluation-bar board-id="board-single" is-default-fen-automatic="true" data-cy="evaluation-bar"" data-dolph="ok" style="flex: 1 1 auto;">
      <div class="evaluation-bar-bar undefined ">
        <span class="evaluation-bar-scoreAbbreviated"></span>
        <span class="evaluation-bar-score"></span>
        <div class="evaluation-bar-fill">
          <div class="evaluation-bar-color evaluation-bar-black"></div>
          <div class="evaluation-bar-color evaluation-bar-draw"></div>
          <div class="evaluation-bar-color evaluation-bar-white" style="transform: translate3d(0, 50%, 0)"></div>
        </div>
      </div>
    </evaluation-bar>`;
	};

	const updateEvaluate = () => {
		const type = window.dolph.evaluationType;
		const value = window.dolph.evaluationValue;
		if (!type || !value) {
			console.log("dolph: no evaluation found");
			return;
		}

		const whiteBar = document.getElementsByClassName(
			"evaluation-bar-color evaluation-bar-white"
		)[0];
		const score = document.getElementsByClassName(
			"evaluation-bar-scoreAbbreviated"
		)[0];
		const scoreHover = document.getElementsByClassName(
			"evaluation-bar-score"
		)[0];
		if (value < 0) {
			score.classList.remove("evaluation-bar-dark");
			score.classList.add("evaluation-bar-light");

			scoreHover.classList.remove("evaluation-bar-dark");
			scoreHover.classList.add("evaluation-bar-light");
		} else {
			score.classList.remove("evaluation-bar-light");
			score.classList.add("evaluation-bar-dark");

			scoreHover.classList.remove("evaluation-bar-light");
			scoreHover.classList.add("evaluation-bar-dark");
		}
		const scoreValueIfCp = value / 100;
		const scoreValueIfMate = value;
		const scoreValueDisplay = parseFloat(scoreValueIfCp.toFixed(1));
		const SCALE = 5;
		if (type === "cp") {
			score.textContent = scoreValueDisplay;
			scoreHover.textContent = `${
				scoreValueIfCp > 0 ? "+" : ""
			}${scoreValueIfCp}`;
			let percent = 50 - scoreValueIfCp * SCALE;
			if (percent < 0) percent = 10;
			if (percent > 100) percent = 90;
			whiteBar.style = `transform: translate3d(0, ${percent}%, 0)`;
		}
		if (type === "mate") {
			score.textContent = `M${Math.abs(scoreValueIfMate)}`;
			scoreHover.textContent = `M${Math.abs(scoreValueIfMate)}`;
			whiteBar.style = `transform: translate3d(0, ${
				scoreValueIfMate < 0 ? 100 : 0
			}%, 0)`;
		}
	};

	chrome.runtime.onMessage.addListener((obj, sender, response) => {
		const {type, value, gameId} = obj;

		if (type === "NEW") {
			currentGameId = gameId;
            console.log('dolph: currentGameId', currentGameId)
			newGameLoaded();
		}
	});

	newGameLoaded();
})();
