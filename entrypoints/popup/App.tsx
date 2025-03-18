import reactLogo from "@/assets/react.svg";
import { useEffect, useState } from "react";
import "./App.css";
import WakuConnectLogo from "/waku-connect-logo.svg";

function App() {
  const [count, setCount] = useState(0);
  const [peers, setPeers] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Start Waku on component mount
  useEffect(() => {
    // Listen for incoming messages from background
    const messageListener = (message: any) => {
      if (message.type === "NEW_MESSAGE") {
        setMessages((prev) => [...prev, message.data]);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup listener
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Fetch connected peers
  const fetchPeers = () => {
    chrome.runtime.sendMessage({ type: "GET_PEERS" }, (response) => {
      setPeers(response.peers || []);
    });
  };

  // Send a message
  const sendWakuMessage = () => {
    chrome.runtime.sendMessage(
      { type: "SEND_MESSAGE", data: "world" },
      (response) => {
        if (response?.success) {
          console.log("Message sent successfully");
        }
      }
    );
  };

  return (
    <>
      <div>
        <a href="https://wxt.dev" target="_blank">
          <img src={WakuConnectLogo} className="logo" alt="WXT logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>WXT + React + Waku</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count {count}
        </button>
        <button onClick={sendWakuMessage}>Send Waku Message</button>
        <button onClick={fetchPeers}>Get Peers</button>
        <p>Peers: {peers.length > 0 ? peers.join(", ") : "None"}</p>
        <p>Messages:</p>
        <ul>
          {messages.map((msg, idx) => (
            <li key={idx}>{JSON.stringify(msg)}</li>
          ))}
        </ul>
      </div>
      <p className="read-the-docs">
        Click on the WXT and React logos to learn more
      </p>
    </>
  );
}

export default App;