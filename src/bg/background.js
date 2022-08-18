chrome.runtime.onMessage.addListener((message, callback) => {
    console.log("$ck sw msg received : ", message);
    if (message.event === "updateBadgeCounter") {
      chrome.action.setBadgeText(
        {
            text : message.data
        }
      );
    }
  });