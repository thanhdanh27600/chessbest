chrome.runtime.onMessage.addListener((obj, sender, response) => {
	const {key} = obj;
	const keyElement = document.getElementById(
		"chessbest-key"
	) as HTMLInputElement;
	if (keyElement) {
		keyElement.value = key;
		keyElement.dispatchEvent(new Event("input"));
	}
});
