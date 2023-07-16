statusElement = document.createElement("input");
statusElement.id = "chessdol-status";
statusElement.style.display = "none";
document.body.appendChild(statusElement);
statusElement.addEventListener("input", async function (evt) {
	try {
		await chrome.runtime.sendMessage({status: this.value});
	} catch (error) {}
});
