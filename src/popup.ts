const statusElement = document.getElementById("status");

const getStatus = () => {
	return new Promise<string>((resolve) => {
		chrome.storage.sync.get("status", (obj) => {
			resolve(obj["status"] || "");
		});
	});
};

getStatus().then((status: string) => {
	if (!statusElement) return;
	statusElement.textContent = status;
});

document.addEventListener("DOMContentLoaded", () => {
	chrome.runtime.onMessage.addListener((obj, sender, response) => {
		if (!statusElement) return;
		const {status} = obj;
		chrome.storage.sync.set({
			status,
		});
		statusElement.textContent = status;
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
