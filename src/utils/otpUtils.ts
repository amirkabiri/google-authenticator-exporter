import * as OTPAuth from "otpauth";
import { parseMigrationURI } from "./migrationUtils";

export interface OTPInfo {
  type: "totp" | "hotp" | "unknown";
  issuer: string;
  account: string;
  secret: string;
  algorithm: string;
  digits: number;
  period?: number;
  counter?: number;
  uri: string;
}

export async function parseOTPUri(
  uri: string
): Promise<OTPInfo | OTPInfo[] | null> {
  try {
    // Check if it's a Google Authenticator migration URI
    if (uri.startsWith("otpauth-migration://offline?data=")) {
      return await parseMigrationURI(uri);
    }

    // Handle standard OTP URIs
    let parsedUri = uri;

    // Try to normalize the URI if it doesn't start with otpauth://
    if (!parsedUri.startsWith("otpauth://")) {
      // Check if it's a URL with otpauth in parameters
      try {
        const url = new URL(parsedUri);
        const otpauthParam = url.searchParams.get("data");
        if (otpauthParam && otpauthParam.startsWith("otpauth://")) {
          parsedUri = otpauthParam;
        }
      } catch {
        // Not a URL, try to see if it's a JSON or other format
        try {
          const jsonData = JSON.parse(parsedUri);
          // If it's JSON, try to extract OTP parameters
          if (jsonData.secret) {
            const type = jsonData.type || "totp";
            const issuer = jsonData.issuer || "";
            const account = jsonData.account || "";
            // Construct a proper otpauth URI
            parsedUri = `otpauth://${type}/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${jsonData.secret}&issuer=${encodeURIComponent(issuer)}`;
            if (type === "totp" && jsonData.period) {
              parsedUri += `&period=${jsonData.period}`;
            } else if (type === "hotp" && jsonData.counter !== undefined) {
              parsedUri += `&counter=${jsonData.counter}`;
            }
            if (jsonData.algorithm) {
              parsedUri += `&algorithm=${jsonData.algorithm}`;
            }
            if (jsonData.digits) {
              parsedUri += `&digits=${jsonData.digits}`;
            }
          }
        } catch {
          // Not JSON
        }
      }
    }

    // If we still couldn't parse into a valid otpauth URI, try one more approach
    if (!parsedUri.startsWith("otpauth://")) {
      // Last resort: Check if it's just a secret key
      const base32Regex = /^[A-Z2-7]+=*$/i;
      if (base32Regex.test(parsedUri)) {
        parsedUri = `otpauth://totp/Default:Account?secret=${parsedUri}&issuer=Default`;
      } else {
        // Not a valid OTP URI
        return null;
      }
    }

    // Try to parse the URI
    const otp = OTPAuth.URI.parse(parsedUri);

    // Check if it's a valid OTP URI
    if (!(otp instanceof OTPAuth.TOTP) && !(otp instanceof OTPAuth.HOTP)) {
      return null;
    }

    // Determine the type
    const type = otp instanceof OTPAuth.TOTP ? "totp" : "hotp";

    // Extract common information
    const info: OTPInfo = {
      type,
      issuer: otp.issuer || "",
      account: otp.label || "",
      secret: otp.secret.base32,
      algorithm: otp.algorithm,
      digits: otp.digits,
      uri: parsedUri,
    };

    // Add type-specific information
    if (type === "totp") {
      info.period = (otp as OTPAuth.TOTP).period;
    } else if (type === "hotp") {
      info.counter = (otp as OTPAuth.HOTP).counter;
    }

    return info;
  } catch (error) {
    console.error("Error parsing OTP URI:", error);
    return null;
  }
}

// Define a type for the algorithm to avoid using 'any'
type OTPAlgorithm = "SHA1" | "SHA256" | "SHA512" | string;

export function generateTOTP(info: OTPInfo): string | null {
  try {
    if (info.type === "totp") {
      const totp = new OTPAuth.TOTP({
        issuer: info.issuer,
        label: info.account,
        algorithm: info.algorithm as OTPAlgorithm,
        digits: info.digits,
        period: info.period || 30,
        secret: OTPAuth.Secret.fromBase32(info.secret),
      });

      return totp.generate();
    } else if (info.type === "hotp" && info.counter !== undefined) {
      const hotp = new OTPAuth.HOTP({
        issuer: info.issuer,
        label: info.account,
        algorithm: info.algorithm as OTPAlgorithm,
        digits: info.digits,
        counter: info.counter,
        secret: OTPAuth.Secret.fromBase32(info.secret),
      });

      return hotp.generate();
    }

    return null;
  } catch (error) {
    console.error("Error generating OTP code:", error);
    return null;
  }
}

export function getRemainingSeconds(period: number = 30): number {
  const seconds = Math.floor(Date.now() / 1000);
  return period - (seconds % period);
}
