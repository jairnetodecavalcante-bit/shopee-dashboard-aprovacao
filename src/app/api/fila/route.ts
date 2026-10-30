import { NextResponse } from "next/server";
import { reenfileirar } from "@/lib/fila";

export const dynamic = "force-dynamic";

/** Tenta de novo uma postagem que falhou 3 vezes. */
export async function POST(req: Request) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
    return NextResponse.json({ erro: "Identificador inválido." }, { status: 400 });
  }
  await reenfileirar(id);
  return NextResponse.json({ ok: true });
}
