const getStatus = () => {
	return new Promise((resolve) => {
		chrome.storage.sync.get("status", (obj) => {
			resolve(obj["status"] || "");
		});
	});
};

getStatus().then((status) => {
	statusElement.textContent = status;
});
const statusElement = document.getElementById("status");

document.addEventListener("DOMContentLoaded", () => {
	chrome.runtime.onMessage.addListener((obj, sender, response) => {
		// console.log(
		// 	sender.tab
		// 		? "from a content script:" + sender.tab.url
		// 		: "from the extension"
		// );
		const {status} = obj;
		chrome.storage.sync.set({
			status,
		});
		statusElement.textContent = status;
	});
});

const submitServerBtn = document.getElementById("server-submit");
submitServerBtn.addEventListener("click", async (e) => {
	const input = document.getElementById("server-input");
	if (!input) return;
	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			lastFocusedWindow: true,
		});
		await chrome.tabs.sendMessage(tab.id, {key: input.value});
	} catch (error) {
		console.error(error);
	}
});
