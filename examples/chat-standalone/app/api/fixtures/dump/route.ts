import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Dev-only: persist Meridian-aligned fixture dumps under examples/chat-standalone/fixtures/.
 * Meridian Spec = proposeView OUTPUT; chat Spec = SpecStream fold (buildSpecFromParts).
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    envelope?: unknown;
    spec?: unknown;
    specVersion?: number | null;
    specFilename?: string | null;
  };

  if (!body.id || body.envelope == null) {
    return Response.json(
      { error: "id and envelope required" },
      { status: 400 },
    );
  }

  const fixturesDir = join(process.cwd(), "fixtures");
  mkdirSync(fixturesDir, { recursive: true });

  const envelopePath = join(fixturesDir, `trace-${body.id}-envelope.json`);
  writeFileSync(envelopePath, JSON.stringify(body.envelope, null, 2), "utf8");

  let specPath: string | null = null;
  if (body.spec != null) {
    const name =
      typeof body.specFilename === "string" && body.specFilename.trim()
        ? body.specFilename.trim()
        : body.specVersion != null
          ? `trace-${body.id}-v${body.specVersion}-spec.json`
          : `trace-${body.id}-spec.json`;
    specPath = join(fixturesDir, name);
    writeFileSync(specPath, JSON.stringify(body.spec, null, 2), "utf8");
  }

  return Response.json({ ok: true, envelopePath, specPath });
}
