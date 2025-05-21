import { useState } from "react";
import QRCode from "qrcode";
import type { OTPInfo } from "../utils/otpUtils";

interface ExportOTPProps {
  otpInfo: OTPInfo;
}

const ExportOTP: React.FC<ExportOTPProps> = ({ otpInfo }) => {
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const exportAsJson = () => {
    // Create a data object with the OTP information
    const data = {
      type: otpInfo.type,
      account: otpInfo.account,
      issuer: otpInfo.issuer,
      secret: otpInfo.secret,
      algorithm: otpInfo.algorithm,
      digits: otpInfo.digits,
      period: otpInfo.period,
      counter: otpInfo.counter,
      uri: otpInfo.uri,
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(data, null, 2);

    // Create a Blob with the JSON data
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");

    // Set link properties
    link.href = url;
    link.download = `${otpInfo.issuer || "unknown"}-${
      otpInfo.account || "account"
    }.json`;

    // Append link to body
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateQrCode = async () => {
    try {
      // Generate QR code as data URL
      const url = await QRCode.toDataURL(otpInfo.uri, {
        errorCorrectionLevel: "H",
        margin: 1,
        scale: 8,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      setQrCodeUrl(url);
      setShowQrCode(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      alert("Failed to generate QR code");
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeUrl) return;

    // Create a link element
    const link = document.createElement("a");

    // Set link properties
    link.href = qrCodeUrl;
    link.download = `${otpInfo.issuer || "unknown"}-${
      otpInfo.account || "account"
    }.png`;

    // Append link to body
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    document.body.removeChild(link);
  };

  const closeQrCode = () => {
    setShowQrCode(false);
  };

  return (
    <>
      <div className="export-buttons">
        <button className="export-button json-button" onClick={exportAsJson}>
          Export as JSON
        </button>
        <button className="export-button qr-button" onClick={generateQrCode}>
          Generate QR Code
        </button>
      </div>

      {showQrCode && qrCodeUrl && (
        <div className="qr-code-modal">
          <div className="qr-code-content">
            <button className="qr-close-button" onClick={closeQrCode}>
              ×
            </button>
            <h3>
              QR Code for {otpInfo.issuer} - {otpInfo.account}
            </h3>
            <div className="qr-code-image-container">
              <img
                src={qrCodeUrl}
                alt="OTP QR Code"
                className="qr-code-image"
              />
            </div>
            <p className="qr-code-instruction">
              Scan this QR code with your authenticator app
            </p>
            <button
              className="export-button download-button"
              onClick={downloadQrCode}
            >
              Download QR Code
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportOTP;
