import { NextResponse } from "next/server";
import { decidirProduto, ErroDeNegocio } from "@/lib/produtos";
import { agendarPostagem } from "@/lib/fila";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let acao: unknown;
  try {
    ({ acao } = await req.json());
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (acao !== "aprovar" && acao !== "rejeitar") {
    return NextResponse.json({ erro: "Ação deve ser 'aprovar' ou 'rejeitar'." }, { status: 400 });
  }

  try {
    const { destino, idFinal } = await decidirProduto(params.id, acao);
    if (acao === "aprovar") {
      const item = await agendarPostagem(idFinal);
      return NextResponse.json({ ok: true, destino, agendadoPara: item.agendadoPara });
    }
    return NextResponse.json({ ok: true, destino });
  } catch (e) {
    if (e instanceof ErroDeNegocio) {
      return NextResponse.json({ erro: e.message }, { status: e.codigo });
    }
    console.error(e);
    return NextResponse.json({ erro: "Erro inesperado ao mover o produto." }, { status: 500 });
  }
}
