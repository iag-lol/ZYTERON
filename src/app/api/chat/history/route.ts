import { NextResponse } from "next/server";
import { chatHistory } from "@/lib/ai/chat-store";
export async function GET(req: Request) {
  try {
    return NextResponse.json(
      { messages: await chatHistory(req) },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos consultar la conversación." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
