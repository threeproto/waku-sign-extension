import { ethers } from "ethers";

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
          const wallet = ethers.Wallet.createRandom();
          await chrome.storage.local.set({ privateKey: wallet.privateKey });
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
        storedKey = await chrome.storage.local.get("privateKey");
        wallet = new ethers.Wallet(storedKey.privateKey, provider);
        const signedTx = await wallet.signTransaction(tx);
        const txResponse = await provider.broadcastTransaction(signedTx);
        chrome.runtime.sendMessage({
          type: "chainChanged",
          data: (await provider.getNetwork()).chainId,
        });
        return txResponse.hash;

      case "eth_chainId":
        return (await provider.getNetwork()).chainId;

      default:
        return provider.send(method, params);
    }
  } catch (error) {
    console.error("error:", error);
  }
}
