import EventEmitter from "eventemitter3";

export class WindowEthereumProvider extends EventEmitter {
  isMyWallet: boolean;

  constructor() {
    super();
    this.isMyWallet = true;
  }

  send(method, params) {
    return this.request({ method, params });
  }

  request(args) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "providerRequest", data: args },
        (response) => {
          resolve(response);
        }
      );
    });
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    console.log("Hello content script!");

    ctx.addEventListener(window, "eip6963:requestProvider", () => {
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

        const wakuProvider = new WindowEthereumProvider()

        const providerDetail = {
          info: {
            uuid: crypto.randomUUID(), // Unique identifier
            name: "Waku Connect Wallet",
            icon: chrome.runtime.getURL("icons/128.png"),
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
  },
});
