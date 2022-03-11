// helper functions
function resetCounter() {
  chrome.storage.local.set({ counter: 0 }, () => {
    updateBadge(0);
    console.log("successfully changed storage");
    chrome.storage.local.get(["counter"], (counter) => console.log(counter));
  });
}

function updateBadge(badgeContent) {
  chrome.action.setBadgeText({ text: String(badgeContent) });
}

// events
chrome.runtime.onInstalled.addListener(() => {
  console.log("This is a service worker!");

  // set up context menu
  chrome.contextMenus.create(
    {
      id: "sampleContextMenu",
      title: "Reset counter",
      contexts: ["page"],
    },
    () => console.log("Successfully initialized context menu")
  );
  // initialize counter persistently
  resetCounter();
  // reset counter from context menu
  chrome.contextMenus.onClicked.addListener(() => resetCounter());
});

chrome.action.onClicked.addListener(() => {
  // when icon is clicked, reset counter
  resetCounter();
});

// message passing
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "incrementCounter") {
    console.log(`Incrementing counter from ${sender.url}`);

    chrome.storage.local.get(["counter"], ({ counter }) => {
      counter++;
      chrome.storage.local.set({ counter });
      updateBadge(counter);
    });
    sendResponse({ result: "success" });
  }
});
