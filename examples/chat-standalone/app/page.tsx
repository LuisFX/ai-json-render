import { redirect } from "next/navigation";
import { createChat, listChats } from "@/lib/conversation/store";

/** URL is conversation SSOT — `/` just picks or creates an id and sends you to `/c/[id]`. */
export default async function HomePage() {
  const rows = await listChats();
  if (rows.length === 0) {
    const id = await createChat();
    redirect(`/c/${id}`);
  }
  redirect(`/c/${rows[0]!.id}`);
}
