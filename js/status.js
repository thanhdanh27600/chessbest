const statusElement = document.createElement("input");
statusElement.id = "chessdol-status";
statusElement.style.display = "none";
document.body.appendChild(statusElement);
statusElement.addEventListener("input", async function (evt) {
	try {
		await chrome.runtime.sendMessage({status: this.value});
	} catch (error) {}
});

chrome.runtime.onMessage.addListener((obj, sender, response) => {
	// console.log(
	// 	sender.tab
	// 		? "from a content script:" + sender.tab.url
	// 		: "from the extension"
	// );
	const {key} = obj;
	const keyElement = document.getElementById("chessdol-key");
	if (keyElement) {
		keyElement.value = key;
		keyElement.dispatchEvent(new Event("input"));
	}
});
