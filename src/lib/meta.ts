import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

const GRAPH_VERSION = "v21.0";
const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function verifyPageAccessToken(pageId: string, token: string): Promise<{ valid: boolean; pageName?: string }> {
  const res = await fetch(`${GRAPH_API}/${pageId}?fields=name&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) return { valid: false };
  const data = await res.json();
  return { valid: true, pageName: data.name };
}

/** Fetches a Meta lead's submitted field data as a flat map, e.g. { full_name, email, phone_number, ... }. */
export async function fetchLeadFieldData(leadgenId: string, pageAccessToken: string): Promise<Record<string, string>> {
  const res = await fetch(`${GRAPH_API}/${leadgenId}?access_token=${encodeURIComponent(pageAccessToken)}`);
  if (!res.ok) throw new Error(`Meta Graph API error fetching lead ${leadgenId}: ${res.status}`);
  const data = await res.json();
  const fields: Record<string, string> = {};
  for (const f of data.field_data || []) {
    fields[f.name] = Array.isArray(f.values) ? f.values.join(", ") : String(f.values ?? "");
  }
  return fields;
}

/** Picks the next active VENDEDOR/LEAD_MANAGER in round-robin fashion, based on how many Meta Ads leads exist so far. */
export async function pickNextVendedorRoundRobin(): Promise<string | null> {
  const candidates = await prisma.user.findMany({
    where: { active: true, role: { in: ["VENDEDOR", "LEAD_MANAGER"] } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (candidates.length === 0) return null;
  const priorLeadCount = await prisma.prospect.count({ where: { metaLeadgenId: { not: null } } });
  const index = priorLeadCount % candidates.length;
  return candidates[index].id;
}

export async function getDecryptedPageToken(pageId: string): Promise<{ token: string; projectId: string | null } | null> {
  const source = await prisma.metaLeadSource.findUnique({ where: { pageId } });
  if (!source || !source.active) return null;
  return { token: decryptSecret(source.pageAccessTokenEnc), projectId: source.projectId };
}
