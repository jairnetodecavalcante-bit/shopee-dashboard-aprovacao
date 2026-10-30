import { NextResponse } from "next/server";
import { diagnostico } from "@/lib/config";
import { executarGarimpo } from "@/lib/garimpo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Garimpo manual (botão "Garimpar agora"). */
export async function POST() {
  const problemas = diagnostico().filter((p) => /SHOPEE|ANTHROPIC/.test(p));
  if (problemas.length) return NextResponse.json({ erro: problemas.join(" ") }, { status: 422 });
  try {
    const r = await executarGarimpo("manual");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro no garimpo." }, { status: 409 });
  }
}
