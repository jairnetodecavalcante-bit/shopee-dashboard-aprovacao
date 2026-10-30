"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  tituloOriginal: string;
  tituloReescrito: string;
  descricaoOriginal: string;
  textoAchadinho: string;
  linkAfiliado: string | null;
  nicho: string | null;
  origem: string | null;
  vendas: number | null;
  avaliacao: number | null;
  comissaoPercentual: number | null;
  precoMin: number | null;
  loja: string | null;
  temImagem: boolean;
  textoFinal: string;
  avisos: string[];
};

export default function ProductCard(p: Props) {
  const router = useRouter();
  const [carregando, setCarregando] = useState<"aprovar" | "rejeitar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [removido, setRemovido] = useState(false);
  const auto = p.origem === "garimpo-automatico";
  const metricas = [
    p.vendas !== null ? `${p.vendas.toLocaleString("pt-BR")} vendidos` : null,
    p.avaliacao !== null ? `nota ${p.avaliacao}` : null,
    p.comissaoPercentual !== null ? `comissão ${String(p.comissaoPercentual).replace(".", ",")}%` : null,
    p.precoMin !== null && p.precoMin > 0
      ? p.precoMin.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null,
  ].filter(Boolean);

  async function decidir(acao: "aprovar" | "rejeitar") {
    setCarregando(acao);
    setErro(null);
    try {
      const resposta = await fetch(`/api/produtos/${encodeURIComponent(p.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível mover o produto.");
      setRemovido(true);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      setCarregando(null);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(p.textoFinal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  if (removido) return null;

  return (
    <article className="grid gap-5 rounded-lg border border-linha bg-white p-4 sm:grid-cols-[220px_1fr] sm:p-5">
      <div className="aspect-square w-full overflow-hidden rounded-md bg-fundo sm:w-[220px]">
        {p.temImagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/imagem/pendentes/${encodeURIComponent(p.id)}`}
            alt={p.tituloReescrito || p.tituloOriginal || p.id}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-suave">
            Sem foto nesta pasta
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <header>
          <h2 className="text-xl font-semibold leading-snug">
            {p.tituloReescrito || <span className="text-rejeitar">Título reescrito ausente</span>}
          </h2>
          {p.tituloOriginal && (
            <p className="mt-1 text-sm text-suave">Título original: {p.tituloOriginal}</p>
          )}
          {(p.nicho || metricas.length > 0) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {p.nicho && (
                <span className="rounded bg-fundo px-2 py-0.5 text-xs font-medium text-tinta">{p.nicho}</span>
              )}
              {metricas.length > 0 && <span className="text-suave">{metricas.join(" · ")}</span>}
            </p>
          )}
          <p className="mt-1 text-xs text-suave">Pasta: pendentes/{p.id}</p>
        </header>

        {auto && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Texto escrito por IA a partir do nome, preço, nota e vendas. A Shopee não envia a descrição completa,
            então confira se os benefícios batem com a página do produto antes de aprovar.
          </p>
        )}

        <section>
          <h3 className="mb-1 text-sm font-medium text-suave">
            {auto ? "Dados da Shopee" : "Descrição original"}
          </h3>
          <p className="max-w-prose whitespace-pre-line rounded-md border border-linha bg-fundo/60 p-3 text-sm leading-relaxed">
            {p.descricaoOriginal || "—"}
          </p>
        </section>

        <section>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-suave">Texto que será publicado</h3>
            <button
              type="button"
              onClick={copiar}
              className="rounded border border-linha px-2 py-1 text-xs font-medium hover:bg-fundo focus-visible:outline focus-visible:outline-2 focus-visible:outline-tinta"
            >
              {copiado ? "Copiado" : "Copiar texto"}
            </button>
          </div>
          <pre className="max-w-prose whitespace-pre-wrap break-words rounded-md border border-linha p-3 font-sans text-sm leading-relaxed">
            {p.textoFinal.split(/(#afiliado)/i).map((trecho, i) =>
              trecho.toLowerCase() === "#afiliado" ? (
                <span key={i} className="font-semibold text-shopee">
                  {trecho}
                </span>
              ) : (
                <span key={i}>{trecho}</span>
              )
            )}
          </pre>
        </section>

        {p.avisos.length > 0 && (
          <ul className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {p.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}

        {erro && (
          <p role="alert" className="rounded-md border border-rejeitar/40 bg-rejeitar/10 p-3 text-sm text-rejeitar">
            {erro}
          </p>
        )}

        <footer className="mt-auto flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => decidir("aprovar")}
            disabled={carregando !== null}
            className="min-w-36 rounded-md bg-aprovar px-5 py-2.5 text-sm font-bold tracking-wide text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aprovar disabled:cursor-not-allowed disabled:opacity-50"
          >
            {carregando === "aprovar" ? "MOVENDO…" : "APROVAR"}
          </button>
          <button
            type="button"
            onClick={() => decidir("rejeitar")}
            disabled={carregando !== null}
            className="min-w-36 rounded-md border-2 border-rejeitar px-5 py-2.5 text-sm font-bold tracking-wide text-rejeitar hover:bg-rejeitar hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rejeitar disabled:cursor-not-allowed disabled:opacity-50"
          >
            {carregando === "rejeitar" ? "MOVENDO…" : "REJEITAR"}
          </button>
        </footer>
      </div>
    </article>
  );
}
