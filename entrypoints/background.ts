import { ethers } from "ethers";

const walletPrivateKey =
  "0xb5587af9844d3524776fc2b892a20afcca96fee67932e45852adf40ab441f4d8";

  let webSocket: WebSocket | null = null;
  let reconnectInterval: NodeJS.Timeout | null = null;
  const url = 'ws://localhost:8080/ws'; // Replace with your WebSocket URL

  const pendingRequests = new Map<number, (response: any) => void>();

export default defineBackground({
  persistent: true,
  main() {
    console.log("Hello background!", { id: browser.runtime.id });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "providerRequest") {
        handleProviderRequestWs(message.data).then(sendResponse);
        return true; // Keep channel open for async response
      }
    });

    function connect() {
      if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
        console.log('WebSocket already connected');
        return;
      }

      webSocket = new WebSocket(url);

      webSocket.onopen = () => {
        console.log('WebSocket connection opened');
        webSocket?.send('Hello from WXT extension!');
        // Clear any reconnect attempts
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }
        // Start a keepalive ping to maintain the connection
        startKeepalive();
      };

      webSocket.onmessage = (event) => {
        if ("ping" === event.data) {
          console.log('Received keepalive ping');
          return 
        }
        let res = JSON.parse(event.data);
        if (res && res.data ) {
          console.log('Message received on websocket:', res);

          const resolve = pendingRequests.get(res.id);
          if (resolve) {
            switch (res.methodRes) {
              case "eth_requestAccounts":
                resolve([res.data]);
                break;
              case "eth_sign":
                resolve(res.data);
                break;
              case "eth_sendTransaction":
                resolve(res.data);
                break;
              case "eth_chainId":
                resolve(res.data);
                break;
              case "net_version":
                resolve(res.data);
                break;
              case "eth_accounts":
                resolve([res.data]);
                break;
              default:
                resolve(res.data);
            }
            pendingRequests.delete(res.id); // Clean up
          }
          // Also forward to content script if needed
          // chrome.runtime.sendMessage({ type: 'websocketMessage', data: res });
        }
        // Forward message to popup or other parts of the extension
        
      };

      webSocket.onclose = () => {
        console.log('WebSocket connection closed');
        webSocket = null;
        // Attempt to reconnect
        startReconnect();
      };

      webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }

    function startKeepalive() {
      setInterval(() => {
        if (webSocket?.readyState === WebSocket.OPEN) {
          webSocket.send('ping');
          console.log('Sent keepalive ping');
        }
      }, 20000); // Ping every 20 seconds
    }

    function startReconnect() {
      if (!reconnectInterval) {
        reconnectInterval = setInterval(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000); // Try reconnecting every 5 seconds
      }
    }

    function disconnect() {
      if (webSocket) {
        webSocket.close();
        webSocket = null;
      }
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    }

    // Initial connection
    connect();
  },
});

async function handleProviderRequestWs({ method, params, id }) {

  console.log("handleProviderRequestWs", method, params, id);
  try {
    let accounts: string[] = [];
    let provider = new ethers.JsonRpcProvider(
      "https://ethereum-sepolia.rpc.subquery.network/public"
    );

    if (method != "eth_requestAccounts" && method != "eth_sign" && method != "eth_sendTransaction" && method != "eth_chainId" && method != "net_version" && method != "eth_accounts") {
      return provider.send(method, params);
    }

    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    console.log("sending message to ws", JSON.stringify({ method, params, id }));
    webSocket.send(JSON.stringify({ method, params, id }));

    // Wait for the response by storing a Promise resolver
    return await new Promise((resolve, reject) => {
      pendingRequests.set(id, resolve); // Store resolver to match with response
      // Optional: Add a timeout to reject if no response is received
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error("WebSocket response timeout"));
        }
      }, 30000); // 10-second timeout
    });

    // let storedKey;
    // let wallet;

    // let accounts: string[] = [];
    // let provider = new ethers.JsonRpcProvider(
    //   "https://ethereum-sepolia.rpc.subquery.network/public"
    // );

    // switch (method) {
    //   case "eth_requestAccounts":
    //     storedKey = await chrome.storage.local.get(["privateKey"]);
    //     console.log("1 storedKey", storedKey.privateKey);
    //     if (!storedKey.privateKey) {
    //       // const wallet = ethers.Wallet.createRandom();
    //       console.log("wallet private key", walletPrivateKey);
    //       await chrome.storage.local.set({ privateKey: walletPrivateKey });
    //     }
    //     storedKey = await chrome.storage.local.get(["privateKey"]);
    //     console.log("2 storedKey", storedKey.privateKey);
    //     wallet = new ethers.Wallet(storedKey.privateKey);
    //     accounts = [wallet.address];
    //     // chrome.runtime.sendMessage({ type: "accountsChanged", data: accounts });
    //     return accounts;

    //   case "eth_sign":
    //     const [signerAddress, message] = params;
    //     storedKey = await chrome.storage.local.get("privateKey");
    //     wallet = new ethers.Wallet(storedKey.privateKey);
    //     if (wallet.address.toLowerCase() === signerAddress.toLowerCase()) {
    //       return wallet.signMessage(message);
    //     }
    //     throw new Error("Signer address mismatch");

    //   case "eth_sendTransaction":
    //     const tx = params[0];
    //     console.log("tx", tx);
    //     tx.chainId = 11155111;
    //     storedKey = await chrome.storage.local.get("privateKey");
    //     wallet = new ethers.Wallet(storedKey.privateKey, provider);
    //     const signedTx = await wallet.signTransaction(tx);
    //     const txResponse = await provider.broadcastTransaction(signedTx);
    //     return txResponse.hash;

    //   case "eth_chainId":
    //     return "0xaa36a7";

    //   case "net_version":
    //     return 11155111;

    //   case "eth_accounts":
    //     storedKey = await chrome.storage.local.get(["privateKey"]);
    //     wallet = new ethers.Wallet(storedKey.privateKey);
    //     return [wallet.address];

    //   default:
    //     return provider.send(method, params);
    // }
  } catch (error) {
    console.error("error:", error);
  }
}

// Handle provider requests
async function handleProviderRequest({ method, params }) {
  try {
    let storedKey;
    let wallet;

    let accounts: string[] = [];
    let provider = new ethers.JsonRpcProvider(
      "https://ethereum-sepolia.rpc.subquery.network/public"
    );

    switch (method) {
      case "eth_requestAccounts":
        storedKey = await chrome.storage.local.get(["privateKey"]);
        console.log("1 storedKey", storedKey.privateKey);
        if (!storedKey.privateKey) {
          // const wallet = ethers.Wallet.createRandom();
          console.log("wallet private key", walletPrivateKey);
          await chrome.storage.local.set({ privateKey: walletPrivateKey });
        }
        storedKey = await chrome.storage.local.get(["privateKey"]);
        console.log("2 storedKey", storedKey.privateKey);
        wallet = new ethers.Wallet(storedKey.privateKey);
        accounts = [wallet.address];
        // chrome.runtime.sendMessage({ type: "accountsChanged", data: accounts });
        return accounts;

      case "eth_sign":
        const [signerAddress, message] = params;
        storedKey = await chrome.storage.local.get("privateKey");
        wallet = new ethers.Wallet(storedKey.privateKey);
        if (wallet.address.toLowerCase() === signerAddress.toLowerCase()) {
          return wallet.signMessage(message);
        }
        throw new Error("Signer address mismatch");

      case "eth_sendTransaction":
        const tx = params[0];
        console.log("tx", tx);
        tx.chainId = 11155111;
        storedKey = await chrome.storage.local.get("privateKey");
        wallet = new ethers.Wallet(storedKey.privateKey, provider);
        const signedTx = await wallet.signTransaction(tx);
        const txResponse = await provider.broadcastTransaction(signedTx);
        return txResponse.hash;

      case "eth_chainId":
        return "0xaa36a7";

      case "net_version":
        return 11155111;

      case "eth_accounts":
        storedKey = await chrome.storage.local.get(["privateKey"]);
        wallet = new ethers.Wallet(storedKey.privateKey);
        return [wallet.address];

      default:
        return provider.send(method, params);
    }
  } catch (error) {
    console.error("error:", error);
  }
}
