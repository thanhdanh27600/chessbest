console.log("chessdol: contentScript run");

const dbDoc = "fens/dolph";
const dbDocHint = "fens/dolph/hint";
const dbDocEvaluation = "fens/dolph/evaluation";
let firebase;
const PopupStatus = {
	OFFLINE: "Offline",
	ENGINE_CONNECTED: "Connected to chess engine",
	WAITING_BOARD: "Waiting for new game",
	GAMEOVER: "Game over. Waiting for new game",
	WAITING_GAME: "Waiting for board's game",
	WAITING_MOVE: "Waiting for new move",
	WAITING_HINT: "Calculating best move",
};

const initCore = () => {
	window.dolph.popup = {status: PopupStatus.OFFLINE};
};
// polling til db connected
const checkDb = () => {
	const dbInterval = setInterval(() => {
		if (!window.dolph) return;
		firebase = window.dolph.firebase;
		if (firebase) {
			console.log("chessdol: firebase connected", firebase);
			setPopupStatus(PopupStatus.ENGINE_CONNECTED);
			newGameLoaded();
			clearInterval(dbInterval);
		}
	}, 500);
};

const setPopupStatus = (status) => {
	window.dolph.popup.status = status;
	updateStatusOnDom();
};
const updateStatusOnDom = () => {
	let statusElement = document.getElementById("chessdol-status");
	if (statusElement) {
		statusElement.value = window.dolph.popup.status;
		statusElement.dispatchEvent(new Event("input"));
	}
};

const newGameLoaded = () => {
	const loopAndAction = setInterval(() => {
		setPopupStatus(PopupStatus.WAITING_BOARD);
		const board = document.getElementsByTagName("chess-board")[0];
		if (!board) {
			console.log("chessdol: Not found Board");
			return;
		}
		setPopupStatus(PopupStatus.WAITING_GAME);
		const game = board.game;
		if (!game) {
			console.log("chessdol: Not found Board Game");
			return;
		}
		setPopupStatus(PopupStatus.WAITING_MOVE);
		clearInterval(loopAndAction);
		window.dolph.game = game;
		initEvaluate();

		const writeUserData = (fen) => {
			console.log("chessdol: Writing...", fen);
			firebase.set(firebase.ref(firebase.db, dbDoc), {
				fen,
			});
		};
		if (!writeUserData) {
			console.log("chessdol: Not found writeUserData");
			return;
		}
		writeUserData(game.getFEN()); // get hint on first load
		// check new move and write
		game.on("Move", ({data}) => {
			const curFen = data.move.fen;
			console.log("chessdol: curFen Move", curFen);
			writeUserData(curFen);
			window.dolph.hint = "";
			setPopupStatus(PopupStatus.WAITING_HINT);
		});
		game.on("Load", ({data}) => {
			const curFen = data.move?.fen;
			if (curFen) {
				console.log("chessdol: curFen Load", curFen);
				writeUserData(curFen);
			}
			initEvaluate();
		});
		// get hint and mark loop
		const intervalMark = setInterval(() => {
			game.markings.removeAll();
			if (game.isGameOver()) {
				setPopupStatus(PopupStatus.GAMEOVER);
				return;
			}
			if (!window.dolph.hint) {
				// console.log("chessdol: Not found hint");
				return;
			}
			mark(window.dolph.hint);
		}, 50);

		const mark = (next) => {
			if (!next) return;
			if (next.lenght < 4) return;
			const from = `${next[0]}${next[1]}`;
			const to = `${next[2]}${next[3]}`;
			game.markings.removeAll();
			game.markings.addOne({
				data: {
					opacity: 0.8,
					from,
					to,
				},
				type: "arrow",
			});
		};

		const listenerEvaluation = (fn) =>
			firebase.onValue(firebase.ref(firebase.db, dbDocEvaluation), fn);

		if (!listenerEvaluation) {
			console.log("chessdol: Not found listener evaluation");
		} else {
			listenerEvaluation((snapshot) => {
				const data = snapshot.val();
				console.log("chessdol: Received evaluation", data);
				setTimeout(updateEvaluate);
				if (data) {
					window.dolph.evaluationType = data.evaluationType;
					window.dolph.evaluationValue = data.evaluationValue;
				}
			});
		}

		const listenerHint = (fn) =>
			firebase.onValue(firebase.ref(firebase.db, dbDocHint), fn);

		if (!listenerHint) {
			console.log("chessdol: Not found listener hint");
		} else {
			listenerHint((snapshot) => {
				const data = snapshot.val();
				console.log("chessdol: Received hint", data);
				if (data) {
					window.dolph.hint = data;
					mark(data.hint);
					if (game.isGameOver()) {
						setPopupStatus(PopupStatus.GAMEOVER);
					} else {
						setPopupStatus(PopupStatus.WAITING_MOVE);
					}
				}
			});
		}

		window.dolph.clearAll = () => {
			clearInterval(intervalMark);
			game.markings.removeAll();
			firebase.off(firebase.ref(firebase.db, dbDoc), "value");
			game.on("Move", ({data}) => {});
			game.on("Load", ({data}) => {});
			setPopupStatus(PopupStatus.OFFLINE);
			console.log("chessdol: turned off");
		};
	}, 500);
};

const initEvaluate = () => {
	const evaluationBoard = document.getElementById("board-layout-evaluation");
	if (evaluationBoard) {
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
	} else {
		console.log("chessdol: no evaluation board found");
	}
};

const updateEvaluate = () => {
	const type = window.dolph.evaluationType;
	const value = window.dolph.evaluationValue;

	const whiteBar = document.getElementsByClassName(
		"evaluation-bar-color evaluation-bar-white"
	)[0];
	const score = document.getElementsByClassName(
		"evaluation-bar-scoreAbbreviated"
	)[0];
	if (!type || !value) {
		console.log("chessdol: no evaluation found");
		return;
	}
	if (!score || !whiteBar) {
		console.log("chessdol: no evaluation element found");
		return;
	}
	const scoreHover = document.getElementsByClassName("evaluation-bar-score")[0];
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

// RUN
initCore();
checkDb();