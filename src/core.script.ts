interface Chessbest {
	popup: {status: string};
	reset: () => void;
	hint?: Hint;
	beforeFen: string;
	firebase: any;
	game: any;
	evaluationType: string;
	evaluationValue: string;
}

type Board = {
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

class Connector {
	updateLogOnDom = (value: string) => {
		if (!value.trim().length) return;

		const logDisplayElement = document.getElementById(
			"logDisplay"
		) as HTMLInputElement;
		if (logDisplayElement) {
			logDisplayElement.value = value;
			logDisplayElement.dispatchEvent(new Event("input"));
		}
	};

	updateStatusOnDom = () => {
		const statusDisplayElement = document.getElementById(
			"statusDisplay"
		) as HTMLInputElement;
		if (statusDisplayElement) {
			statusDisplayElement.value = W.Chessbest.popup.status;
			statusDisplayElement.dispatchEvent(new Event("input"));
		}
	};

	clearLogger = () => {
		this.updateLogOnDom("_CLEAR_");
	};

	logger = (...arg: any[]) => {
		console.log(...arg);
		const value = JSON.stringify(arg);
		this.updateLogOnDom(value);
	};
}

const connector = new Connector();

connector.logger("chessbest: contentScript run");

const W: typeof window & {Chessbest: Chessbest} = window as any;

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
	W.Chessbest.popup.status = status;
	connector.updateStatusOnDom();
};

const initCore = () => {
	W.Chessbest.popup = {status: PopupStatus.OFFLINE};
	W.Chessbest.reset = () => {};
	initDbDoc();
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
		W.Chessbest.reset();
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
		if (!W.Chessbest) return;
		firebase = W.Chessbest.firebase;
		if (firebase) {
			connector.logger("chessbest: firebase connected", firebase);
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
			connector.logger("chessbest: Not found Board");
			return;
		}
		setPopupStatus(PopupStatus.WAITING_GAME);
		const game = board.game;
		if (!game) {
			connector.logger("chessbest: Not found Board Game");
			return;
		}
		setPopupStatus(PopupStatus.WAITING_MOVE);
		clearInterval(loopAndAction);
		W.Chessbest.game = game;

		const writeUserData = (fen: string) => {
			connector.logger("chessbest: Writing...", fen);
			firebase.set(firebase.ref(firebase.db, dbDoc), {
				fen,
			});
		};
		if (!writeUserData) {
			connector.logger("chessbest: Not found writeUserData");
			return;
		}
		writeUserData(game.getFEN()); // get hint on first load
		// check new move and write
		game.on("Move", ({data}: {data: DataGame}) => {
			if (W.Chessbest.popup.status === PopupStatus.OFFLINE) return;
			initEvaluate();
			const curFen = data.move.fen;
			connector.logger("chessbest: curFen Move", curFen);
			writeUserData(curFen);
			W.Chessbest.beforeFen = curFen;
			setPopupStatus(PopupStatus.WAITING_HINT);
		});
		game.on("Load", ({data}: {data: DataGame}) => {
			if (W.Chessbest.popup.status === PopupStatus.OFFLINE) return;
			initEvaluate();

			const curFen = data.move?.fen;
			if (curFen) {
				connector.logger("chessbest: curFen Load", curFen);
				writeUserData(curFen);
			}
		});
		// get hint and mark loop
		let throttleInterval = new Date().getTime();
		const intervalMark = setInterval(() => {
			if (game.isGameOver()) {
				setPopupStatus(PopupStatus.GAMEOVER);
				return;
			}
			if (!W.Chessbest.hint) {
				const now = new Date().getTime();
				if (now - throttleInterval > 1000) {
					connector.clearLogger();
					connector.logger("chessbest: Not found hint");
					throttleInterval = now;
				}
				return;
			}
			mark(W.Chessbest.hint);
		}, 50);

		const mark = (next: Hint) => {
			if (!next) return;
			const hint = next.value;
			const fen = next.fen;
			if (hint.length < 4) return;
			if (W.Chessbest.beforeFen !== fen) {
				// connector.logger("chessbest: fen not match");
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
			connector.logger("chessbest: Not found listener evaluation");
		} else {
			listenerEvaluation((snapshot: any) => {
				const data = snapshot.val();
				if (W.Chessbest.beforeFen !== data?.evaluationFen) {
					// connector.logger("chessbest: fen not match");
					return;
				}
				connector.logger("chessbest: Received evaluation", data);
				setTimeout(updateEvaluate);
				if (data) {
					W.Chessbest.evaluationType = data.evaluationType;
					W.Chessbest.evaluationValue = data.evaluationValue;
				}
			});
		}

		const listenerHint = (fn: (snapshot: any) => void) =>
			firebase.onValue(firebase.ref(firebase.db, dbDocHint), fn);

		if (!listenerHint) {
			connector.logger("chessbest: Not found listener hint");
		} else {
			listenerHint((snapshot) => {
				const data = snapshot.val();
				connector.logger("chessbest: Received hint", data);
				if (data) {
					W.Chessbest.hint = data;
					mark(data);
					if (game.isGameOver()) {
						setPopupStatus(PopupStatus.GAMEOVER);
					} else {
						setPopupStatus(PopupStatus.WAITING_MOVE);
					}
				}
			});
		}

		W.Chessbest.reset = () => {
			clearInterval(intervalMark);
			game.markings.removeAll();
			firebase.off(firebase.ref(firebase.db, dbDocHint), "value");
			firebase.off(firebase.ref(firebase.db, dbDocEvaluation), "value");
			game.on("Move", ({data}: {data: DataGame}) => {});
			game.on("Load", ({data}: {data: DataGame}) => {});
			setPopupStatus(PopupStatus.OFFLINE);
			connector.logger("chessbest: cleared");
		};
	}, 500);
};

const initEvaluate = () => {
	const evaluationBoard = document.getElementById("board-layout-evaluation");
	const existing =
		document.getElementsByTagName("wc-evaluation-bar").length > 0;
	if (existing) return;
	if (evaluationBoard) {
		evaluationBoard.innerHTML = `<wc-evaluation-bar board-id="board-single" is-default-fen-automatic="true" data-cy="evaluation-bar"" data-dolph="ok" style="flex: 1 1 auto;">
      <div class="evaluation-bar-bar undefined ">
        <span class="evaluation-bar-scoreAbbreviated"></span>
        <span class="evaluation-bar-score"></span>
        <div class="evaluation-bar-fill">
          <div class="evaluation-bar-color evaluation-bar-black"></div>
          <div class="evaluation-bar-color evaluation-bar-draw"></div>
          <div class="evaluation-bar-color evaluation-bar-white" style="transform: translate3d(0, 50%, 0)"></div>
        </div>
      </div>
    </wc-evaluation-bar>`;
	} else {
		connector.logger("chessbest: no evaluation board found");
	}
};

const updateEvaluate = () => {
	const type = W.Chessbest.evaluationType;
	const value = W.Chessbest.evaluationValue;

	const whiteBar = document.getElementsByClassName(
		"evaluation-bar-color evaluation-bar-white"
	)[0] as any;
	const score = document.getElementsByClassName(
		"evaluation-bar-scoreAbbreviated"
	)[0];
	if (!type || !value) {
		connector.logger("chessbest: no evaluation found");
		return;
	}
	if (!score || !whiteBar) {
		connector.logger("chessbest: no evaluation element found");
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
