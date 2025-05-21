import { useState, useEffect, useRef } from "react";
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";
import { BrowserCodeReader } from "@zxing/browser";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => Promise<void>;
  onScanError?: (error: string) => void;
}

interface BoundingBox {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  text: string;
}

// Point type with x,y coordinates
interface Point {
  x: number;
  y: number;
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
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [permissionRequested, setPermissionRequested] =
    useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize the scanner
  useEffect(() => {
    const hints = new Map();
    const formats = [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    // Create the reader with QR code format support
    const codeReader = new BrowserMultiFormatReader(hints);
    readerRef.current = codeReader;

    // Clean up
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Start/stop scanning based on scanning state
  useEffect(() => {
    if (scanning && readerRef.current && deviceId && videoRef.current) {
      setStatusMessage("Starting camera...");

      readerRef.current
        .decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          async (result, error) => {
            if (result && !isScanning) {
              setIsScanning(true);
              setStatusMessage("QR code detected! Processing...");

              // Get position of QR code in the image
              const points = result.getResultPoints();
              if (points && points.length >= 3 && videoRef.current) {
                // Get video dimensions
                const videoWidth = videoRef.current.videoWidth;
                const videoHeight = videoRef.current.videoHeight;
                const displayWidth = videoRef.current.offsetWidth;
                const displayHeight = videoRef.current.offsetHeight;

                // Calculate scale factors
                const scaleX = displayWidth / videoWidth;
                const scaleY = displayHeight / videoHeight;

                // Map points from original image to displayed size
                const mappedPoints: Point[] = points.map((point) => ({
                  x: point.getX() * scaleX,
                  y: point.getY() * scaleY,
                }));

                // Create safe points with defaults if missing
                const safePoints: Point[] = [
                  mappedPoints[0] || { x: 0, y: 100 }, // Bottom left
                  mappedPoints[1] || { x: 0, y: 0 }, // Top left
                  mappedPoints[2] || { x: 100, y: 0 }, // Top right
                  mappedPoints[3] || { x: 100, y: 100 }, // Bottom right
                ];

                // Create bounding box from points
                setBoundingBox({
                  bottomLeft: safePoints[0],
                  topLeft: safePoints[1],
                  topRight: safePoints[2],
                  bottomRight: safePoints[3],
                  text: result.getText(),
                });

                try {
                  // Process the result - this might take time for Google Auth migration codes
                  await onScanSuccess(result.getText());
                } catch (err) {
                  console.error("Error processing scan result:", err);
                  if (onScanError)
                    onScanError(
                      `Error processing scan: ${
                        err instanceof Error ? err.message : "Unknown error"
                      }`
                    );
                } finally {
                  setIsScanning(false);
                }
              } else {
                // No points available, still process the result
                try {
                  await onScanSuccess(result.getText());
                } catch (err) {
                  console.error("Error processing scan result:", err);
                  if (onScanError)
                    onScanError(
                      `Error processing scan: ${
                        err instanceof Error ? err.message : "Unknown error"
                      }`
                    );
                } finally {
                  setIsScanning(false);
                }
              }
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
          }
        )
        .catch((err) => {
          setStatusMessage(`Failed to start camera: ${err.message}`);
          if (onScanError) onScanError(`Camera error: ${err.message}`);
          setScanning(false);
          setIsScanning(false);
        });
    } else if (!scanning && readerRef.current) {
      readerRef.current.reset();
      setStatusMessage("");
      setBoundingBox(null);
      setIsScanning(false);
    }

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
      setBoundingBox(null);
      setIsScanning(false);
    };
  }, [scanning, deviceId, onScanSuccess, onScanError, isScanning]);

  const startScanner = () => {
    setStatusMessage("Initializing camera...");

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices) {
      setStatusMessage("Camera access is not supported in your browser.");
      if (onScanError) onScanError("Camera API not supported");
      return;
    }

    // Request camera permission only when user clicks the button
    if (!permissionRequested) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          // Release the stream immediately - we just want to trigger the permission prompt
          stream.getTracks().forEach((track) => track.stop());
          setPermissionRequested(true);

          // Now list available devices
          return BrowserCodeReader.listVideoInputDevices();
        })
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
            // Now that we have a device ID, set scanning to true to start the camera
            setScanning(true);
          } else {
            setStatusMessage("No cameras found.");
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setStatusMessage(`Error accessing camera: ${err.message}`);
          if (onScanError)
            onScanError(`Failed to access camera: ${err.message}`);
        });
    } else {
      // If permission was already requested, just start scanning
      setScanning(true);
    }
  };

  const stopScanner = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScanning(false);
    setStatusMessage("");
    setBoundingBox(null);
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
        `Switched to camera: ${
          availableDevices[nextIndex].label || "Unnamed camera"
        }`
      );
      // Restart scanner with new camera
      setTimeout(() => {
        setScanning(true);
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
          <div
            ref={videoContainerRef}
            className="video-container"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "800px",
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: "100%",
                borderRadius: "12px",
              }}
            />

            {boundingBox && (
              <div className="qr-bounding-box">
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  <polygon
                    points={`
                      ${boundingBox.topLeft.x},${boundingBox.topLeft.y} 
                      ${boundingBox.topRight.x},${boundingBox.topRight.y}
                      ${boundingBox.bottomRight.x},${boundingBox.bottomRight.y} 
                      ${boundingBox.bottomLeft.x},${boundingBox.bottomLeft.y}
                    `}
                    fill="rgba(77, 124, 254, 0.3)"
                    stroke="#4d7cfe"
                    strokeWidth="4"
                  />
                </svg>
              </div>
            )}
          </div>

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
