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
		console.log("obj", obj);
		const {status} = obj;
		chrome.storage.sync.set({
			status,
		});
		statusElement.textContent = status;
	});
});


serverSubmit = (e) => {
	e.preventDefault();
	console.log(e);
};
