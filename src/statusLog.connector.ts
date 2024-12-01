const element = document.createElement("input") as HTMLInputElement;
element.id = "statusDisplay";
element.style.display = "none";
document.body.appendChild(element);
element.addEventListener("input", async function (evt) {
	try {
		await chrome.runtime.sendMessage({
			status: (this as HTMLInputElement).value,
		});
	} catch (error) {}
});

const elementLog = document.createElement("input") as HTMLInputElement;
elementLog.id = "logDisplay";
elementLog.style.display = "none";
document.body.appendChild(elementLog);
elementLog.addEventListener("input", async function (evt) {
	try {
		await chrome.runtime.sendMessage({
			log: (this as HTMLInputElement).value,
		});
	} catch (error) {}
});
