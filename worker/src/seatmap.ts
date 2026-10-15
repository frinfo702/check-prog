import seatMap from "./seat_map.json";

const keys = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    keys.set(secret, key);
  }
  return key;
}

/** 学籍番号から席を引く。値は "1A:l" のように机と左右を持つ。学籍番号そのものは保存しない。 */
export async function seatFor(
  secret: string,
  studentId: string,
): Promise<string | null> {
  const id = studentId.trim();
  if (!/^\d{4,20}$/.test(id)) return null;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(id),
  );
  const hex = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return (seatMap as Record<string, string>)[hex] ?? null;
}
