function updateCounter() {
    chrome.runtime.sendMessage({ event: "getBadgeCounter" }, function (response) {
        var counter = "0";
        if (response && response.counter) {
            counter = response.counter;
        }
        var counterEl = document.getElementById("counter");
        if (counterEl) {
            counterEl.textContent = counter;
        }
    });
}

document.addEventListener("DOMContentLoaded", updateCounter);
