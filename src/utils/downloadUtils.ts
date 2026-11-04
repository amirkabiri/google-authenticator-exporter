export function sanitizeJsonFileName(name: string): string {
  const withoutExtension = name.trim().replace(/\.json$/i, "");
  const safeName = withoutExtension
    // Characters that are not allowed in file names on most platforms.
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return `${safeName || "otp-export"}.json`;
}

export function downloadJson(data: unknown, fileName: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = sanitizeJsonFileName(fileName);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
