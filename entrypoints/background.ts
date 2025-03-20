import { ethers } from "ethers";

const walletPrivateKey = "0xb5587af9844d3524776fc2b892a20afcca96fee67932e45852adf40ab441f4d8";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "providerRequest") {
      handleProviderRequest(message.data).then(sendResponse);
      return true; // Keep channel open for async response
    }
  });
});

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
