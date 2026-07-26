import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, fetchLeadFieldData, pickNextVendedorRoundRobin, getDecryptedPageToken } from "@/lib/meta";

/** Meta's webhook subscription verification handshake. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function pickName(fields: Record<string, string>): string {
  return fields.full_name || fields.name || [fields.first_name, fields.last_name].filter(Boolean).join(" ") || "Lead de Meta Ads";
}

function pickEmail(fields: Record<string, string>): string | undefined {
  return fields.email;
}

function pickPhone(fields: Record<string, string>): string | undefined {
  return fields.phone_number || fields.phone;
}

function extraFieldsNote(fields: Record<string, string>): string | null {
  const known = new Set(["full_name", "name", "first_name", "last_name", "email", "phone_number", "phone"]);
  const extra = Object.entries(fields).filter(([k]) => !known.has(k));
  if (extra.length === 0) return null;
  return extra.map(([k, v]) => `${k}: ${v}`).join("\n");
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  // Always ack 200 once the signature is valid, so Meta doesn't retry-storm us on per-lead errors.
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;
      try {
        await processLead(change.value);
      } catch (err) {
        console.error("Failed to process Meta lead:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function processLead(value: { leadgen_id: string; page_id: string; form_id?: string; ad_name?: string }) {
  const { leadgen_id: leadgenId, page_id: pageId } = value;
  if (!leadgenId || !pageId) return;

  const existing = await prisma.prospect.findUnique({ where: { metaLeadgenId: leadgenId } });
  if (existing) return;

  const source = await getDecryptedPageToken(pageId);
  if (!source) {
    console.error(`Meta lead ${leadgenId}: no active MetaLeadSource configured for page ${pageId}`);
    return;
  }

  const fields = await fetchLeadFieldData(leadgenId, source.token);
  const assignedUserId = await pickNextVendedorRoundRobin();
  const notesParts = [
    "Lead capturado automáticamente de Meta Ads.",
    value.ad_name ? `Anuncio: ${value.ad_name}` : null,
    extraFieldsNote(fields),
  ].filter(Boolean);

  const prospect = await prisma.prospect.create({
    data: {
      name: pickName(fields),
      email: pickEmail(fields) || null,
      phone: pickPhone(fields) || null,
      sourceType: "CAMPANA",
      stage: "SIN_CONTACTAR",
      projectId: source.projectId,
      assignedUserId,
      notes: notesParts.join("\n\n"),
      metaLeadgenId: leadgenId,
      activities: {
        create: {
          type: "CREACION",
          content: "Prospecto creado automáticamente desde un formulario de Meta Ads",
          userId: assignedUserId,
        },
      },
    },
  });

  console.log(`Created prospect ${prospect.id} from Meta lead ${leadgenId}`);
}
