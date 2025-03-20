import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    retrieveAccounts();
  }, []);

  const retrieveAccounts = async () => {
    console.log("retrieveAccounts");
    const accounts = await chrome.runtime.sendMessage({
      type: "providerRequest",
      data: { method: "eth_requestAccounts" },
    });

    console.log("accounts", accounts);

    setAccounts(accounts);
  };

  const handleAdd = () => {
    console.log("add:", count);
    setCount((count) => count + 1);
  }

  return (
    <>
      <h1>My Waku Connect</h1>

      <div id="account">
        <button onClick={retrieveAccounts}>Get Accounts</button>
        <ul>
          {accounts.map((account, idx) => (
            <li key={idx}>account: {account}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <button onClick={handleAdd}>
          count {count}
        </button>
      </div>
    </>
  );
}

export default App;
