
export default defineContentScript({
  matches: ["*://*/*"],
  async main() {
    console.log("Injecting script...");
    await injectScript("/injected.js", {
      keepInDom: true,
    });
    console.log("Done!");

    // Listen for messages from the injected script
    window.addEventListener("message", (event) => {
      if (event.source !== window || !event.data || event.data.source !== "waku-wallet") {
        return;
      }

      console.log("Forwarding message to background script:", event.data);

      // Forward the message to the background script
      chrome.runtime.sendMessage(event.data, (response) => {
        console.log("Response from background:", response);

        // Send the response back to the injected script
        window.postMessage(
          {
            source: "waku-wallet-response",
            id: event.data.id, // Keep the same ID
            response,
          },
          "*"
        );
      });
    });
  },
});
