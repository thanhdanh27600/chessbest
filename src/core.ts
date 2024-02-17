console.log("chessbest: contentScript run");

interface Dolph {
	popup: {status: string};
	clearAll: () => void;
	hint?: Hint;
	beforeFen: string;
	firebase: any;
	game: any;
	evaluationType: string;
	evaluationValue: string;
}

type Board =
	| undefined
	| {
			game: any;
	  };

type DataGame = {
	move: {
		fen: string;
	};
};

interface Hint {
	value: string;
	fen: string;
}

const W: typeof window & {dolph: Dolph} = window as any;

const sharedKey = "shared-2706";
const dbDocFn = (key: string) => `fens/${key}`;
let dbDoc: string;
const dbDocHintFn = (key: string) => `fens/${key}/hint`;
let dbDocHint: string;
let dbDocEvaluationFn = (key: string) => `fens/${key}/evaluation`;
let dbDocEvaluation: string;
const initDbDoc = (key = sharedKey) => {
	dbDoc = dbDocFn(key);
	dbDocHint = dbDocHintFn(key);
	dbDocEvaluation = dbDocEvaluationFn(key);
};
initDbDoc();

let firebase: any = {};
const PopupStatus = {
	OFFLINE: "Offline",
	ENGINE_CONNECTED: "Connected to chess engine",
	WAITING_BOARD: "Waiting for new game",
	GAMEOVER: "Game over. Waiting for new game",
	WAITING_GAME: "Waiting for board's game",
	WAITING_MOVE: "Waiting for new move",
	WAITING_HINT: "Calculating best move",
};

const setPopupStatus = (status: string) => {
	W.dolph.popup.status = status;
	updateStatusOnDom();
};
const updateStatusOnDom = () => {
	const statusDisplayElement = document.getElementById(
		"statusDisplay"
	) as HTMLInputElement;
	if (statusDisplayElement) {
		statusDisplayElement.value = W.dolph.popup.status;
		statusDisplayElement.dispatchEvent(new Event("input"));
	}
};

const updateLogOnDom = () => {
	const logDisplayElement = document.getElementById(
		"logDisplay"
	) as HTMLInputElement;
	if (logDisplayElement) {
		logDisplayElement.value = W.dolph.popup.status;
		logDisplayElement.dispatchEvent(new Event("input"));
	}
};

const initCore = () => {
	W.dolph.popup = {status: PopupStatus.OFFLINE};
	W.dolph.clearAll = () => {};
	initKeyServerElement();
};

const initKeyServerElement = () => {
	const keyElement = document.createElement("input");
	keyElement.id = "chessbest-key";
	keyElement.style.display = "none";
	document.body.appendChild(keyElement);
	keyElement.addEventListener("input", async function (evt) {
		const key = this.value;
		setPopupStatus(PopupStatus.OFFLINE);
		W.dolph.clearAll();
		checkServerKey(key)(function () {
			initDbDoc(key);
			newGameLoaded();
		});
		// check key
	});
};
const checkServerKey = (key: string) => (fn: () => void) => {
	if (firebase) {
		firebase
			.get(firebase.ref(firebase.db, `servers/${key}`))
			.then((snapshot: any) => {
				if (snapshot.exists() && snapshot.val()) {
					fn();
				}
			})
			.catch((error: any) => {
				console.error(error);
			});
	}
};
// polling til db connected
const checkDb = () => {
	const dbInterval = setInterval(() => {
		if (!W.dolph) return;
		firebase = W.dolph.firebase;
		if (firebase) {
			console.log("chessbest: firebase connected", firebase);
			clearInterval(dbInterval);
			checkServerKey(sharedKey)(function () {
				newGameLoaded();
				setPopupStatus(PopupStatus.ENGINE_CONNECTED);
			});
		}
	}, 500);
};

const newGameLoaded = () => {
	const loopAndAction = setInterval(() => {
		setPopupStatus(PopupStatus.WAITING_BOARD);
		const board = document.getElementsByTagName(
			"wc-chess-board"
		)[0] as unknown as Board;
		if (!board) {
			console.log("chessbest: Not found Board");
			return;
		}
		setPopupStatus(PopupStatus.WAITING_GAME);
		const game = board.game;
		if (!game) {
			console.log("chessbest: Not found Board Game");
			return;
		}
		setPopupStatus(PopupStatus.WAITING_MOVE);
		clearInterval(loopAndAction);
		W.dolph.game = game;
		initEvaluate();

		const writeUserData = (fen: string) => {
			console.log("chessbest: Writing...", fen);
			firebase.set(firebase.ref(firebase.db, dbDoc), {
				fen,
			});
		};
		if (!writeUserData) {
			console.log("chessbest: Not found writeUserData");
			return;
		}
		writeUserData(game.getFEN()); // get hint on first load
		// check new move and write
		game.on("Move", ({data}: {data: DataGame}) => {
			if (W.dolph.popup.status === PopupStatus.OFFLINE) return;

			const curFen = data.move.fen;
			console.log("chessbest: curFen Move", curFen);
			writeUserData(curFen);
			W.dolph.beforeFen = curFen;
			setPopupStatus(PopupStatus.WAITING_HINT);
		});
		game.on("Load", ({data}: {data: DataGame}) => {
			if (W.dolph.popup.status === PopupStatus.OFFLINE) return;

			const curFen = data.move?.fen;
			if (curFen) {
				console.log("chessbest: curFen Load", curFen);
				writeUserData(curFen);
			}
			initEvaluate();
		});
		// get hint and mark loop
		const intervalMark = setInterval(() => {
			if (game.isGameOver()) {
				setPopupStatus(PopupStatus.GAMEOVER);
				return;
			}
			if (!W.dolph.hint) {
				console.log("chessbest: Not found hint");
				return;
			}
			mark(W.dolph.hint);
		}, 50);

		const mark = (next: Hint) => {
			if (!next) return;
			const hint = next.value;
			const fen = next.fen;
			if (hint.length < 4) return;
			if (W.dolph.beforeFen !== fen) {
				console.log("chessbest:  fen not match");
				return;
			}
			const from = `${hint[0]}${hint[1]}`;
			const to = `${hint[2]}${hint[3]}`;
			game.markings.removeAll();
			game.markings.addOne({
				data: {
					color: "#96be46",
					from,
					to,
				},
				type: "arrow",
			});
		};

		const listenerEvaluation = (fn: (snapshot: any) => void) =>
			firebase.onValue(firebase.ref(firebase.db, dbDocEvaluation), fn);

		if (!listenerEvaluation) {
			console.log("chessbest: Not found listener evaluation");
		} else {
			listenerEvaluation((snapshot: any) => {
				const data = snapshot.val();
				console.log("chessbest: Received evaluation", data);
				setTimeout(updateEvaluate);
				if (data) {
					W.dolph.evaluationType = data.evaluationType;
					W.dolph.evaluationValue = data.evaluationValue;
				}
			});
		}

		const listenerHint = (fn: (snapshot: any) => void) =>
			firebase.onValue(firebase.ref(firebase.db, dbDocHint), fn);

		if (!listenerHint) {
			console.log("chessbest: Not found listener hint");
		} else {
			listenerHint((snapshot) => {
				const data = snapshot.val();
				console.log("chessbest: Received hint", data);
				if (data) {
					W.dolph.hint = data;
					mark(data);
					if (game.isGameOver()) {
						setPopupStatus(PopupStatus.GAMEOVER);
					} else {
						setPopupStatus(PopupStatus.WAITING_MOVE);
					}
				}
			});
		}

		W.dolph.clearAll = () => {
			clearInterval(intervalMark);
			game.markings.removeAll();
			firebase.off(firebase.ref(firebase.db, dbDocHint), "value");
			firebase.off(firebase.ref(firebase.db, dbDocEvaluation), "value");
			game.on("Move", ({data}: {data: DataGame}) => {});
			game.on("Load", ({data}: {data: DataGame}) => {});
			setPopupStatus(PopupStatus.OFFLINE);
			console.log("chessbest: cleared");
		};
	}, 500);
};

const initEvaluate = () => {
	const evaluationBoard = document.getElementsByTagName("evaluation-bar")[0];
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
		console.log("chessbest: no evaluation board found");
	}
};

const updateEvaluate = () => {
	const type = W.dolph.evaluationType;
	const value = W.dolph.evaluationValue;

	const whiteBar = document.getElementsByClassName(
		"evaluation-bar-color evaluation-bar-white"
	)[0] as any;
	const score = document.getElementsByClassName(
		"evaluation-bar-scoreAbbreviated"
	)[0];
	if (!type || !value) {
		console.log("chessbest: no evaluation found");
		return;
	}
	if (!score || !whiteBar) {
		console.log("chessbest: no evaluation element found");
		return;
	}
	const scoreHover = document.getElementsByClassName("evaluation-bar-score")[0];
	const parseValue = +value;
	if (parseValue < 0) {
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
	const scoreValueIfCp = parseValue / 100;
	const scoreValueIfMate = parseValue;
	const scoreValueDisplay = parseFloat(scoreValueIfCp.toFixed(1));
	const SCALE = 5;
	if (type === "cp") {
		score.textContent = scoreValueDisplay + "";
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
