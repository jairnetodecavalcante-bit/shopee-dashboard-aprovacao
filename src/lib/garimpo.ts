import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { catIdDoNicho, NICHOS } from "./nichos";
import { buscarOfertas, passaNosFiltros, type Oferta } from "./shopee";
import { montarTextoAchadinho, reescrever } from "./reescrita";
import { comTrava, gravarEstado, lerEstado, type UltimoGarimpo } from "./estado";

export type ResultadoGarimpo = UltimoGarimpo & { detalhes: string[] };

const g = globalThis as { __garimpoRodando?: boolean };

const EXT_POR_TIPO: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

async function baixarFoto(url: string, pasta: string): Promise<boolean> {
  if (!url) return false;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return false;
    const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = EXT_POR_TIPO[tipo];
    if (!ext) return false;
    await fs.writeFile(path.join(pasta, `foto${ext}`), Buffer.from(await r.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

function reais(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function salvarProduto(o: Oferta, nichoSlug: string, nichoNome: string): Promise<string> {
  const r = await reescrever(o, nichoNome);
  const id = `${nichoSlug}-${o.itemId}`;
  const pasta = path.join(process.cwd(), "pendentes", id);
  await fs.mkdir(pasta, { recursive: true });
  await baixarFoto(o.imagemUrl, pasta);

  const preco =
    o.precoMin && o.precoMax && o.precoMin !== o.precoMax
      ? `${reais(o.precoMin)} a ${reais(o.precoMax)}`
      : reais(o.precoMin || o.precoMax);

  const json = {
    origem: "garimpo-automatico",
    garimpado_em: new Date().toISOString(),
    nicho: nichoNome,
    item_id: o.itemId,
    titulo_original: o.nome,
    titulo_reescrito: r.titulo,
    descricao_original:
      `Dados da Shopee (a API não informa a descrição completa): ${o.nome}. ` +
      `Loja: ${o.loja}. Preço: ${preco}. Nota: ${o.avaliacao}. Vendidos: ${o.vendas}. ` +
      `Comissão: ${(o.comissao * 100).toFixed(1).replace(".", ",")}%.`,
    texto_achadinho: montarTextoAchadinho(r),
    link_afiliado: o.linkAfiliado,
    imagem_url: o.imagemUrl,
    loja: o.loja,
    vendas: o.vendas,
    avaliacao: o.avaliacao,
    comissao_percentual: Number((o.comissao * 100).toFixed(2)),
    preco_min: o.precoMin,
    preco_max: o.precoMax,
  };
  await fs.writeFile(path.join(pasta, "produto.json"), JSON.stringify(json, null, 2), "utf-8");
  return id;
}

/**
 * Uma rodada de garimpo: pega o próximo nicho do rodízio, busca ofertas,
 * aplica os filtros, reescreve e salva em /pendentes.
 */
export async function executarGarimpo(origem: "agendado" | "manual"): Promise<ResultadoGarimpo> {
  if (g.__garimpoRodando) throw new Error("Já existe um garimpo em andamento.");
  g.__garimpoRodando = true;
  try {
    return await rodarGarimpo(origem);
  } finally {
    g.__garimpoRodando = false;
  }
}

async function rodarGarimpo(origem: "agendado" | "manual"): Promise<ResultadoGarimpo> {
  const estado = await comTrava(() => lerEstado());
  const nicho = NICHOS[estado.proximoIndice % NICHOS.length];
  const rodada = estado.rodadasPorNicho[nicho.slug] ?? 0;
  const catId = catIdDoNicho(nicho.slug);
  const palavra = catId ? "" : nicho.palavras[rodada % nicho.palavras.length];

  const resultado: ResultadoGarimpo = {
    em: new Date().toISOString(),
    origem,
    nicho: nicho.nome,
    palavra: palavra || `categoria ${catId}`,
    encontrados: 0,
    salvos: 0,
    detalhes: [],
  };

  try {
    const ofertas = await buscarOfertas({ palavra, catId, maxPaginas: config.maxPaginas() });
    const vistos = new Set(estado.vistos);
    const candidatos = ofertas
      .filter(passaNosFiltros)
      .filter((o) => !vistos.has(o.itemId))
      // Prioriza quem rende mais por venda (preço × comissão).
      .sort((a, b) => (b.precoMin * b.comissao) - (a.precoMin * a.comissao));
    resultado.encontrados = candidatos.length;

    const salvosIds: string[] = [];
    for (const o of candidatos) {
      if (salvosIds.length >= config.produtosPorRodada()) break;
      try {
        const id = await salvarProduto(o, nicho.slug, nicho.nome);
        salvosIds.push(o.itemId);
        resultado.detalhes.push(`Salvo: ${id}`);
      } catch (e) {
        resultado.detalhes.push(`Pulado ${o.itemId}: ${e instanceof Error ? e.message : "erro"}`);
        // Erros de configuração valem para todos os produtos: interrompe a rodada.
        if (e instanceof Error && /ANTHROPIC_API_KEY|Anthropic API \((401|403|429)/.test(e.message)) {
          resultado.erro = e.message;
          break;
        }
      }
    }
    resultado.salvos = salvosIds.length;

    await comTrava(async () => {
      const atual = await lerEstado();
      atual.vistos = [...atual.vistos, ...salvosIds].slice(-5000);
      if (!resultado.erro) {
        atual.proximoIndice = (estado.proximoIndice + 1) % NICHOS.length;
        atual.rodadasPorNicho[nicho.slug] = rodada + 1;
      }
      atual.ultimoGarimpo = { ...resultado };
      await gravarEstado(atual);
    });
  } catch (e) {
    resultado.erro = e instanceof Error ? e.message : "Erro desconhecido no garimpo.";
    await comTrava(async () => {
      const atual = await lerEstado();
      atual.ultimoGarimpo = { ...resultado };
      await gravarEstado(atual);
    });
  }
  return resultado;
}

export function garimpoEmAndamento(): boolean {
  return Boolean(g.__garimpoRodando);
}
