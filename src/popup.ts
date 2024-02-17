const statusElement = document.getElementById("status");
const logElement = document.getElementById("log");

const getStatus = () => {
	return new Promise<string>((resolve) => {
		chrome.storage.sync.get("status", (obj) => {
			resolve(obj["status"] || "");
		});
	});
};

const getLog = () => {
	return new Promise<string>((resolve) => {
		chrome.storage.sync.get("log", (obj) => {
			resolve(obj["log"] || "");
		});
	});
};

getStatus().then((status: string) => {
	if (!statusElement) return;
	statusElement.textContent = status;
});

document.addEventListener("DOMContentLoaded", () => {
	// status listener
	chrome.runtime.onMessage.addListener((obj, sender, response) => {
		const {status, log} = obj;
		chrome.storage.sync.set({
			status,
		});
		getLog().then((oldLog: string) => {
			chrome.storage.sync.set({
				log: oldLog + log,
			});
		});
		if (statusElement) statusElement.textContent = status;
		if (logElement) logElement.textContent += `\n${log}`;
	});
});

const submitServerBtn = document.getElementById("server-submit");
submitServerBtn?.addEventListener("click", async (e) => {
	const input = document.getElementById("server-input") as HTMLInputElement;
	if (!input) return;
	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			lastFocusedWindow: true,
		});
		await chrome.tabs.sendMessage(Number(tab.id), {key: input.value});
	} catch (error) {
		console.error(error);
	}
});
