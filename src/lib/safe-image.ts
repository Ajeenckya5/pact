/** Accept only browser-generated preview URLs for <img src>. */
export function previewSrc(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("blob:") || value.startsWith("data:image/")) return value;
  return undefined;
}
