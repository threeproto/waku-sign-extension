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
          icon: "test",
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
