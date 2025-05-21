import { useState } from "react";
import "./App.css";
import QrScanner from "./components/QrScanner";

function App() {
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const handleScanSuccess = (decodedText: string) => {
    setScannedResult(decodedText);
  };

  const handleScanError = (error: string) => {
    console.error("QR Scan Error:", error);
  };

  return (
    <div className="app-container">
      <h1>QR Code Scanner</h1>

      <QrScanner
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
      />

      {scannedResult && (
        <div className="result-container">
          <h2>Scanned Result:</h2>
          <div className="result-text">{scannedResult}</div>
          <button
            className="copy-button"
            onClick={() => {
              navigator.clipboard
                .writeText(scannedResult)
                .then(() => alert("Copied to clipboard!"))
                .catch((err) => console.error("Failed to copy: ", err));
            }}
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
