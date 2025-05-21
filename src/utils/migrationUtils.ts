import * as protobuf from "protobufjs";
import * as base64js from "base64-js";
import type { OTPInfo } from "./otpUtils";

// Define interface for migration payload to avoid using 'any'
interface MigrationPayloadObject {
  otpParameters?: Array<{
    secret: number[];
    name?: string;
    issuer?: string;
    algorithm?: string;
    digits?: string;
    type?: string;
    counter?: string;
  }>;
}

// Define the protocol buffer structure for Google Authenticator's migration format
const migrationProto = `
syntax = "proto3";

message MigrationPayload {
  repeated OtpParameters otp_parameters = 1;
  enum Algorithm {
    ALGORITHM_UNSPECIFIED = 0;
    ALGORITHM_SHA1 = 1;
    ALGORITHM_SHA256 = 2;
    ALGORITHM_SHA512 = 3;
    ALGORITHM_MD5 = 4;
  }
  enum DigitCount {
    DIGIT_COUNT_UNSPECIFIED = 0;
    DIGIT_COUNT_SIX = 1;
    DIGIT_COUNT_EIGHT = 2;
  }
  message OtpParameters {
    bytes secret = 1;
    string name = 2;
    string issuer = 3;
    Algorithm algorithm = 4;
    DigitCount digits = 5;
    OtpType type = 6;
    int64 counter = 7;
  }
  enum OtpType {
    OTP_TYPE_UNSPECIFIED = 0;
    OTP_TYPE_HOTP = 1;
    OTP_TYPE_TOTP = 2;
  }
}
`;

// This function converts a base64 URL encoded string to a Uint8Array
function base64UrlToBytes(base64url: string): Uint8Array {
  // Convert base64url to base64 by replacing URL-safe chars and adding padding
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/%2F/g, "/")
    .replace(/%2B/g, "+")
    .replace(/%3D/g, "=");

  // Add padding if needed
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  try {
    return base64js.toByteArray(padded);
  } catch (e) {
    console.error("Error decoding base64:", e);
    throw e;
  }
}

// Convert the binary secret to base32 string
function secretToBase32(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  let bits = 0;
  let value = 0;

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  // Pad with '=' to make it a multiple of 8
  while (result.length % 8 !== 0) {
    result += "=";
  }

  return result;
}

// Parse the migration URI and return an array of OTPInfo objects
export async function parseMigrationURI(uri: string): Promise<OTPInfo[]> {
  if (!uri.startsWith("otpauth-migration://offline?data=")) {
    throw new Error("Not a valid Google Authenticator migration URI");
  }

  try {
    // Extract the data parameter from the URI
    const dataParam = uri.replace("otpauth-migration://offline?data=", "");

    // Decode the base64 URL encoded data
    const bytes = base64UrlToBytes(dataParam);

    // Create a protobuf root from our schema
    const root = protobuf.parse(migrationProto).root;

    // Get the message type
    const MigrationPayload = root.lookupType("MigrationPayload");

    // Decode the message
    const message = MigrationPayload.decode(bytes);
    const payload = MigrationPayload.toObject(message, {
      longs: String,
      enums: String,
      bytes: Array,
    }) as MigrationPayloadObject;

    // Convert each OTP parameter to our OTPInfo format
    const result: OTPInfo[] = [];

    if (payload.otpParameters && Array.isArray(payload.otpParameters)) {
      for (const param of payload.otpParameters) {
        // Convert algorithm number to string
        let algorithm = "SHA1"; // Default
        if (param.algorithm === "1") algorithm = "SHA1";
        else if (param.algorithm === "2") algorithm = "SHA256";
        else if (param.algorithm === "3") algorithm = "SHA512";
        else if (param.algorithm === "4") algorithm = "MD5";

        // Convert digit count to number
        let digits = 6; // Default
        if (param.digits === "1") digits = 6;
        else if (param.digits === "2") digits = 8;

        // Convert type to string
        const type = param.type === "1" ? "hotp" : "totp";

        // Convert secret to base32
        const secretBytes = new Uint8Array(param.secret);
        const secretBase32 = secretToBase32(secretBytes);

        // Create standard otpauth URI
        let otpUri = `otpauth://${type}/`;
        if (param.issuer && param.name) {
          otpUri += `${encodeURIComponent(param.issuer)}:${encodeURIComponent(param.name)}`;
        } else if (param.name) {
          otpUri += encodeURIComponent(param.name);
        } else if (param.issuer) {
          otpUri += encodeURIComponent(param.issuer);
        } else {
          otpUri += "Unknown";
        }

        otpUri += `?secret=${secretBase32}`;

        if (param.issuer) {
          otpUri += `&issuer=${encodeURIComponent(param.issuer)}`;
        }

        if (type === "hotp" && param.counter) {
          otpUri += `&counter=${param.counter}`;
        }

        otpUri += `&algorithm=${algorithm}&digits=${digits}`;

        result.push({
          type: type as "totp" | "hotp",
          issuer: param.issuer || "",
          account: param.name || "",
          secret: secretBase32,
          algorithm,
          digits,
          period: type === "totp" ? 30 : undefined,
          counter: type === "hotp" ? Number(param.counter) : undefined,
          uri: otpUri,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error parsing migration URI:", error);
    throw error;
  }
}
