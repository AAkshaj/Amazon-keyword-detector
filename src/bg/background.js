var badgeCounter = "0";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("$ck sw msg received : ", message);
    if (message.event === "updateBadgeCounter") {
        badgeCounter = message.data || "0";
        chrome.action.setBadgeText({ text: badgeCounter });
        return;
    }

    if (message.event === "getBadgeCounter") {
        sendResponse({ counter: badgeCounter });
    }
});