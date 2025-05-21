import { useState, useEffect, useCallback } from "react";
import "./App.css";
import QrScanner from "./components/QrScanner";
import ExportOTP from "./components/ExportOTP";
import type { OTPInfo } from "./utils/otpUtils";
import {
  parseOTPUri,
  generateTOTP,
  getRemainingSeconds,
} from "./utils/otpUtils";

function App() {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [otpInfoList, setOtpInfoList] = useState<OTPInfo[]>([]);
  const [selectedOtpIndex, setSelectedOtpIndex] = useState<number>(0);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [parseError, setParseError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(true);

  // Get the currently selected OTP info
  const selectedOtpInfo =
    otpInfoList.length > 0 ? otpInfoList[selectedOtpIndex] : null;

  // Generate TOTP code and update timer
  useEffect(() => {
    if (!selectedOtpInfo || selectedOtpInfo.type !== "totp") return;

    // Generate initial code
    const code = generateTOTP(selectedOtpInfo);
    if (code) {
      setOtpCode(code);
    }

    // Set up timer
    const period = selectedOtpInfo.period || 30;
    setRemainingSeconds(getRemainingSeconds(period));

    const intervalId = setInterval(() => {
      const remaining = getRemainingSeconds(period);
      setRemainingSeconds(remaining);

      // Regenerate code when the period resets
      if (remaining === period) {
        const newCode = generateTOTP(selectedOtpInfo);
        if (newCode) {
          setOtpCode(newCode);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [selectedOtpInfo]);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    setScannedResult(decodedText);
    setParseError(null);
    setScanning(false);

    // Try to parse as OTP URI
    try {
      const info = await parseOTPUri(decodedText);

      if (info) {
        if (Array.isArray(info)) {
          // We have multiple OTP entries (from migration QR)
          setOtpInfoList(info);
          setSelectedOtpIndex(0);
        } else {
          // Single OTP entry
          setOtpInfoList([info]);
          setSelectedOtpIndex(0);
        }
      } else {
        setOtpInfoList([]);
        setOtpCode(null);
        setParseError("QR code is not a valid OTP URI");
      }
    } catch (error) {
      console.error("Error parsing OTP:", error);
      setOtpInfoList([]);
      setOtpCode(null);
      setParseError(
        `Failed to parse QR code: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, []);

  const handleScanError = useCallback((error: string) => {
    console.error("QR Scan Error:", error);
    setParseError(`QR scanning error: ${error}`);
  }, []);

  const handleCopyCode = useCallback(() => {
    if (otpCode) {
      navigator.clipboard
        .writeText(otpCode)
        .then(() => alert("OTP code copied to clipboard!"))
        .catch((err) => console.error("Failed to copy: ", err));
    }
  }, [otpCode]);

  const handleCopySecret = useCallback(() => {
    if (selectedOtpInfo?.secret) {
      navigator.clipboard
        .writeText(selectedOtpInfo.secret)
        .then(() => alert("Secret key copied to clipboard!"))
        .catch((err) => console.error("Failed to copy: ", err));
    }
  }, [selectedOtpInfo]);

  const handleCopyRawText = useCallback(() => {
    if (scannedResult) {
      navigator.clipboard
        .writeText(scannedResult)
        .then(() => alert("Raw text copied to clipboard!"))
        .catch((err) => console.error("Failed to copy: ", err));
    }
  }, [scannedResult]);

  const handleScanAgain = useCallback(() => {
    setScanning(true);
    setScannedResult(null);
    setOtpInfoList([]);
    setOtpCode(null);
    setParseError(null);
  }, []);

  const handleSelectOtp = useCallback(
    (index: number) => {
      if (index >= 0 && index < otpInfoList.length) {
        setSelectedOtpIndex(index);
      }
    },
    [otpInfoList]
  );

  return (
    <div className="app-container">
      <h1>Google Authenticator Exporter</h1>

      {scanning ? (
        <QrScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
        />
      ) : (
        <button className="scan-again-button" onClick={handleScanAgain}>
          Scan Another QR Code
        </button>
      )}

      {parseError && (
        <div className="error-message">
          <p>{parseError}</p>
        </div>
      )}

      {otpInfoList.length > 1 && (
        <div className="otp-selector">
          <h2>Select Account</h2>
          <div className="account-list">
            {otpInfoList.map((info, index) => (
              <div
                key={index}
                className={`account-item ${index === selectedOtpIndex ? "selected" : ""}`}
                onClick={() => handleSelectOtp(index)}
              >
                <div className="account-issuer">
                  {info.issuer || "Unknown Issuer"}
                </div>
                <div className="account-name">
                  {info.account || "Unknown Account"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedOtpInfo && (
        <div className="result-container auth-result">
          <h2>Authentication Data</h2>

          <div className="otp-header">
            {selectedOtpInfo.issuer && (
              <div className="otp-issuer">{selectedOtpInfo.issuer}</div>
            )}
            {selectedOtpInfo.account && (
              <div className="otp-account">{selectedOtpInfo.account}</div>
            )}
          </div>

          {selectedOtpInfo.type === "totp" && otpCode && (
            <div className="otp-code-container">
              <div className="otp-code">
                {otpCode.match(/.{1,3}/g)?.join(" ")}
              </div>
              <div className="otp-timer">
                <div
                  className="timer-bar"
                  style={{
                    width: `${(remainingSeconds / (selectedOtpInfo.period || 30)) * 100}%`,
                    backgroundColor:
                      remainingSeconds <= 5 ? "#ef4444" : "#10b981",
                  }}
                ></div>
                <span>{remainingSeconds}s</span>
              </div>
              <button
                className="copy-button otp-copy-button"
                onClick={handleCopyCode}
              >
                Copy Code
              </button>
            </div>
          )}

          <div className="otp-details">
            <div className="otp-detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                {selectedOtpInfo.type.toUpperCase()}
              </span>
            </div>
            <div className="otp-detail-row">
              <span className="detail-label">Algorithm:</span>
              <span className="detail-value">{selectedOtpInfo.algorithm}</span>
            </div>
            <div className="otp-detail-row">
              <span className="detail-label">Digits:</span>
              <span className="detail-value">{selectedOtpInfo.digits}</span>
            </div>
            {selectedOtpInfo.type === "totp" && (
              <div className="otp-detail-row">
                <span className="detail-label">Period:</span>
                <span className="detail-value">
                  {selectedOtpInfo.period || 30}s
                </span>
              </div>
            )}
            {selectedOtpInfo.type === "hotp" && (
              <div className="otp-detail-row">
                <span className="detail-label">Counter:</span>
                <span className="detail-value">{selectedOtpInfo.counter}</span>
              </div>
            )}
            <div className="otp-detail-row secret-row">
              <span className="detail-label">Secret:</span>
              <span className="detail-value secret-value">
                {selectedOtpInfo.secret}
              </span>
              <button
                className="copy-button secret-copy-button"
                onClick={handleCopySecret}
              >
                Copy Secret
              </button>
            </div>
          </div>

          <ExportOTP otpInfo={selectedOtpInfo} />
        </div>
      )}

      {otpInfoList.length > 1 && (
        <div className="export-all-container">
          <button
            className="export-all-button"
            onClick={() => {
              const jsonData = otpInfoList.map((info) => ({
                type: info.type,
                account: info.account,
                issuer: info.issuer,
                secret: info.secret,
                algorithm: info.algorithm,
                digits: info.digits,
                period: info.period,
                counter: info.counter,
                uri: info.uri,
              }));

              // Create JSON blob
              const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);

              // Create download link
              const link = document.createElement("a");
              link.href = url;
              link.download = "google-authenticator-export.json";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            Export All Accounts as JSON
          </button>
        </div>
      )}

      {scannedResult && otpInfoList.length === 0 && (
        <div className="result-container">
          <h2>Scanned Result (Not a valid OTP code):</h2>
          <div className="result-text">{scannedResult}</div>
          <button className="copy-button" onClick={handleCopyRawText}>
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
