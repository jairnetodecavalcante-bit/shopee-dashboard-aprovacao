import { NextResponse } from "next/server";
import { ehStatus, lerImagem } from "@/lib/produtos";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { status: string; id: string } }
) {
  if (!ehStatus(params.status)) {
    return NextResponse.json({ erro: "Pasta inválida." }, { status: 400 });
  }
  const imagem = await lerImagem(params.status, params.id);
  if (!imagem) {
    return NextResponse.json({ erro: "Imagem não encontrada." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(imagem.dados), {
    headers: {
      "Content-Type": imagem.tipo,
      "Cache-Control": "no-store",
      // Evita execução de scripts caso um SVG malicioso seja aberto direto.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
