chrome.tabs.onUpdated.addListener((tabId, tab) => {
	if (tab.url && tab.url.includes("chess.com/game/live/")) {
		const gameId = tab.url.split("live/")[1];

		chrome.tabs.sendMessage(tabId, {
			type: "NEW",
			gameId,
		});
	}
});
