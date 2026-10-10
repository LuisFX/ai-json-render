import {
  createChat,
  listChats,
  saveChat,
  toSidebarSummary,
} from "@/lib/conversation/store";
import type { UIMessage } from "ai";

export async function GET() {
  const rows = await listChats();
  return Response.json(rows.map(toSidebarSummary));
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    messages?: UIMessage[];
    create?: boolean;
  };

  if (body.create === true) {
    const id = await createChat();
    return Response.json({ id });
  }

  if (!body.id || !Array.isArray(body.messages)) {
    return Response.json(
      { error: "id and messages are required (or create:true)" },
      { status: 400 },
    );
  }

  const envelope = await saveChat({ chatId: body.id, messages: body.messages });
  return Response.json(envelope);
}
