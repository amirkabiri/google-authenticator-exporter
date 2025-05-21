import { useState, useEffect, useRef } from "react";
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";
import { BrowserCodeReader } from "@zxing/browser";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({
  onScanSuccess,
  onScanError,
}) => {
  const [scanning, setScanning] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [statusMessage, setStatusMessage] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  // Initialize the scanner
  useEffect(() => {
    const hints = new Map();
    const formats = [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    // Create the reader with QR code format support
    const codeReader = new BrowserMultiFormatReader(hints);
    readerRef.current = codeReader;

    // Get available video devices
    BrowserCodeReader.listVideoInputDevices()
      .then((devices) => {
        setAvailableDevices(devices);
        if (devices.length > 0) {
          // Prefer rear camera if available
          const backCamera = devices.find((device) =>
            /back|rear|environment/i.test(device.label)
          );
          setDeviceId(backCamera ? backCamera.deviceId : devices[0].deviceId);
          setStatusMessage(
            `Found ${devices.length} camera(s). ` +
              (backCamera ? "Using rear camera." : "Using default camera.")
          );
        } else {
          setStatusMessage("No cameras found.");
        }
      })
      .catch((err) => {
        setStatusMessage(`Error listing cameras: ${err.message}`);
        if (onScanError) onScanError(`Failed to list cameras: ${err.message}`);
      });

    // Clean up
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [onScanError]);

  // Start/stop scanning based on scanning state
  useEffect(() => {
    if (scanning && readerRef.current && deviceId && videoRef.current) {
      setStatusMessage("Starting camera...");

      readerRef.current
        .decodeFromVideoDevice(deviceId, videoRef.current, (result, error) => {
          if (result) {
            setStatusMessage("QR code detected!");
            onScanSuccess(result.getText());
            // Keep scanning running - uncomment the following line to stop after first detection
            // stopScanner();
          }
          if (
            error &&
            !error.message.includes(
              "No MultiFormat Readers were able to detect"
            )
          ) {
            setStatusMessage(`Scanning error: ${error.message}`);
            if (onScanError) onScanError(error.message);
          }
        })
        .catch((err) => {
          setStatusMessage(`Failed to start camera: ${err.message}`);
          if (onScanError) onScanError(`Camera error: ${err.message}`);
          setScanning(false);
        });
    } else if (!scanning && readerRef.current) {
      readerRef.current.reset();
      setStatusMessage("");
    }

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [scanning, deviceId, onScanSuccess, onScanError]);

  const startScanner = () => {
    setScanning(true);
    setStatusMessage("Initializing camera...");
  };

  const stopScanner = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScanning(false);
    setStatusMessage("");
  };

  const changeCamera = () => {
    stopScanner();
    if (availableDevices.length > 1) {
      // Find the current device index
      const currentIndex = availableDevices.findIndex(
        (device) => device.deviceId === deviceId
      );
      // Move to the next device or back to the first
      const nextIndex = (currentIndex + 1) % availableDevices.length;
      setDeviceId(availableDevices[nextIndex].deviceId);
      setStatusMessage(
        `Switched to camera: ${availableDevices[nextIndex].label || "Unnamed camera"}`
      );
      // Restart scanner with new camera
      setTimeout(() => {
        startScanner();
      }, 500);
    }
  };

  return (
    <div className="qr-scanner">
      <button
        onClick={scanning ? stopScanner : startScanner}
        className="camera-button"
      >
        {scanning ? "Close Camera" : "Open Camera"}
      </button>

      {scanning && (
        <div className="reader-container">
          <video
            ref={videoRef}
            style={{
              width: "100%",
              maxWidth: "800px",
              borderRadius: "12px",
            }}
          />

          <p className="scanner-instruction">
            Position QR code in front of camera
          </p>

          {availableDevices.length > 1 && (
            <button onClick={changeCamera} className="switch-camera-button">
              Switch Camera
            </button>
          )}

          {statusMessage && (
            <div className="status-message">{statusMessage}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default QrScanner;
