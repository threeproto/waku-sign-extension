import EventEmitter from "eventemitter3";

export default defineUnlistedScript(() => {
  console.log("Hello from injected.ts");

  window.addEventListener("eip6963:requestProvider", () => {
    console.log("Requesting provider");

    try {
      // Define the wallet provider
      const myWalletProvider = {
        isMyWallet: true,
        request: () => {
          return "hello";
        },
        // request: async (args) => {
        //   return new Promise((resolve) => {
        //     // chrome.runtime.sendMessage(
        //     //   { type: "providerRequest", data: args },
        //     //   (response) => {
        //     //     resolve(response);
        //     //   }
        //     // );
        //     resolve({ result: "success" });
        //   });
        // },
        // on: (eventName, callback) => {
        //   chrome.runtime.onMessage.addListener((message) => {
        //     if (message.type === eventName) {
        //       callback(message.data);
        //     }
        //   });
        // },
        // enable: async () =>
        //   myWalletProvider.request({ method: "eth_requestAccounts" }), // Legacy support
      };

      // EIP-6963 ProviderDetail

      const wakuProvider = new WindowEthereumProvider();

      const providerDetail = {
        info: {
          uuid: crypto.randomUUID(), // Unique identifier
          name: "Waku Connect Wallet",
          icon: "data:image/svg+xml;base64," + btoa(`
            <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="150" cy="150" r="150" fill="black"/>
<circle cx="187.5" cy="224.5" r="37.5" fill="white"/>
<circle cx="112.5" cy="74.5" r="37.5" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M150 300V150C108.579 150 75 183.579 75 225C75 266.421 108.579 300 150 300Z" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M150 150C191.421 150 225 116.421 225 75C225 33.5786 191.421 0 150 0V150Z" fill="white"/>
</svg>
          `),
          rdns: "com.myextension.wallet",
        },
        provider: wakuProvider,
      };

      console.log("dispatch eip6963:announceProvider", providerDetail);

      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: Object.freeze(providerDetail),
        })
      );
    } catch (error) {
      console.error("error:", error);
    }
  });
});

export class WindowEthereumProvider extends EventEmitter {
  isMyWallet = true;
  requestId = 0; // Unique request counter
  pendingRequests = new Map(); // Store pending requests

  constructor() {
    super();
    this.isMyWallet = true;
    this.requestId = 0; // Unique request counter
    this.pendingRequests = new Map(); // Store pending requests
  }

  send(method, params) {
    return this.request({ method, params });
  }

  request = (args) => {
    return new Promise((resolve, reject) => {
      console.log(
        "---Sending message from Injected Script to Content Script",
        args
      );

      this.requestId += 1;
      const requestId = this.requestId;

      console.log(`Sending request ${requestId}:`, args);

      // Store the callback so we can resolve it later
      this.pendingRequests.set(requestId, { resolve, reject });

      args.id = requestId;

      window.postMessage(
        {
          source: "waku-wallet",
          type: "providerRequest",
          id: requestId,
          data: args,
        },
        "*"
      );

      // Listen for the response
      const handler = (event) => {
        console.log("received event:", event);
        if (
          event.data?.source === "waku-wallet-response" &&
          event.data.id === requestId
        ) {
          console.log(
            `----Received response for request ${requestId}:`,
            event.data.response
          );

          // Resolve the correct promise
          const request = this.pendingRequests.get(event.data.id);
          if (request) {
            console.log("======Resolving request", event.data.response);
            request.resolve(event.data.response);
            this.pendingRequests.delete(event.data.id); // Clean up
          }

          window.removeEventListener("message", handler);
        }
      };

      window.addEventListener("message", handler);
    });
  };
}
