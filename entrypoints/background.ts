if (typeof process === "undefined") {
  (globalThis as any).process = {
    env: {}, // Empty object or add specific env vars if needed
  };
}

import {
  createDecoder,
  createEncoder,
  createLightNode,
  DecodedMessage,
  Protocols
} from "@waku/sdk";

import debug from "debug";
debug.enable('waku*');

// Define content topic globally
const contentTopic = "/light-guide/1/message/proto";

// Global Waku node instance
let wakuNode: any = null;

async function startWaku() {
  if (wakuNode && wakuNode.isStarted()) {
    console.log("Waku node already running");
    return;
  }

  try {
    wakuNode = await createLightNode({ defaultBootstrap: true });
    await wakuNode.start();
    console.log("Waku node started:", wakuNode.isStarted());

    // Wait for peers with specific protocols
    await wakuNode.waitForPeers([Protocols.LightPush, Protocols.Filter], 60000);
    console.log("Connected to peers");

    // Log peer info
    const peers = wakuNode.libp2p.getPeers();
    console.log(
      "Peers:",
      peers.map((p: any) => p.toString())
    );
  } catch (error) {
    console.error("Failed to start Waku:", error);
  }
}

// Send a message via LightPush
async function sendMessage(message: string) {
  if (!wakuNode || !wakuNode.isStarted()) {
    console.error("Waku node not started");
    return;
  }

  const encoder = createEncoder({ contentTopic, ephemeral: true });
  const serialisedMessage = new TextEncoder().encode(
    JSON.stringify({ msg: message })
  );

  try {
    await wakuNode.lightPush.send(encoder, { payload: serialisedMessage });
    console.log("Message sent:", message);
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}

// Subscribe to incoming messages
async function subscribeToMessages() {
  if (!wakuNode || !wakuNode.isStarted()) {
    console.error("Waku node not started");
    return;
  }

  const decoder = createDecoder(contentTopic);
  const callback = (wakuMessage: DecodedMessage) => {
    if (!wakuMessage.payload) return;
    const messageObj = JSON.parse(
      new TextDecoder().decode(wakuMessage.payload)
    );
    console.log("Received message:", messageObj);
    // Send received message to frontend
    chrome.runtime.sendMessage({ type: "NEW_MESSAGE", data: messageObj });
  };

  try {
    const { error, subscription } = await wakuNode.filter.subscribe(
      decoder,
      callback
    );
    if (error || !subscription) {
      console.error("Subscription error:", error);
    } else {
      console.log("Subscribed to messages");
    }
  } catch (error) {
    console.error("Subscription failed:", error);
  }
}

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // Start Waku when the background script loads
  startWaku().then(() => subscribeToMessages());

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SEND_MESSAGE") {
      sendMessage(message.data).then(() => sendResponse({ success: true }));
      return true;
    } else if (message.type === "GET_PEERS") {
      const peers = wakuNode?.libp2p.getPeers().map((p: any) => p.toString()) || [];
      console.log("peers:", peers);
      sendResponse({ peers });
      return false; // Synchronous response
    }
  });
});
