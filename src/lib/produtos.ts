import fs from "node:fs/promises";
import path from "node:path";

export const STATUS = ["pendentes", "aprovados", "rejeitados"] as const;
export type Status = (typeof STATUS)[number];

const RAIZ = process.cwd();
const EXTENSOES_IMAGEM: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/** Hashtag obrigatória nas publicações de afiliado. */
export const HASHTAG_OBRIGATORIA = "#afiliado";

export type Produto = {
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

export type ResultadoListagem = {
  produtos: Produto[];
  invalidos: { id: string; motivo: string }[];
};

/** Aceita apenas nomes de pasta simples, evitando acesso fora das pastas do projeto. */
export function idValido(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

export function ehStatus(valor: string): valor is Status {
  return (STATUS as readonly string[]).includes(valor);
}

function caminho(status: Status, id?: string): string {
  return id ? path.join(RAIZ, status, id) : path.join(RAIZ, status);
}

/**
 * Monta o texto final de publicação: título + texto original + link, sempre
 * terminando com #afiliado (a hashtag é sempre a última coisa do texto).
 */
export function montarTextoFinal(
  tituloReescrito: string,
  corpo: string,
  linkAfiliado: string | null
): string {
  const partes = [tituloReescrito.trim(), corpo.trim()];
  if (linkAfiliado) partes.push(linkAfiliado.trim());
  const semHashtag = partes
    .filter(Boolean)
    .join("\n\n")
    .replace(/\s*#afiliado\b/gi, "")
    .trimEnd();
  return `${semHashtag}\n\n${HASHTAG_OBRIGATORIA}`;
}

async function acharImagem(status: Status, id: string): Promise<string | null> {
  try {
    const arquivos = await fs.readdir(caminho(status, id));
    const imagem = arquivos.find((a) => path.extname(a).toLowerCase() in EXTENSOES_IMAGEM);
    return imagem ?? null;
  } catch {
    return null;
  }
}

export async function lerImagem(
  status: Status,
  id: string
): Promise<{ dados: Buffer; tipo: string } | null> {
  if (!idValido(id)) return null;
  const nome = await acharImagem(status, id);
  if (!nome) return null;
  const dados = await fs.readFile(path.join(caminho(status, id), nome));
  const tipo = EXTENSOES_IMAGEM[path.extname(nome).toLowerCase()];
  return { dados, tipo };
}

function numeroOuNulo(v: unknown): number | null {
  const n = Number(v);
  return v !== undefined && v !== null && v !== "" && Number.isFinite(n) ? n : null;
}

async function lerProduto(status: Status, id: string): Promise<Produto> {
  const bruto = await fs.readFile(path.join(caminho(status, id), "produto.json"), "utf-8");
  const json = JSON.parse(bruto);

  const tituloOriginal = String(json.titulo_original ?? "").trim();
  const tituloReescrito = String(json.titulo_reescrito ?? "").trim();
  const descricaoOriginal = String(json.descricao_original ?? "").trim();
  const textoAchadinho = String(json.texto_achadinho ?? "").trim();
  const linkAfiliado = json.link_afiliado ? String(json.link_afiliado) : null;
  const temImagem = (await acharImagem(status, id)) !== null;

  const avisos: string[] = [];
  if (!tituloReescrito) avisos.push("Falta o título reescrito (campo titulo_reescrito).");
  if (!textoAchadinho && !descricaoOriginal)
    avisos.push("Falta o texto (campos texto_achadinho ou descricao_original).");
  if (!linkAfiliado) avisos.push("Falta o link de afiliado (campo link_afiliado). Sem ele não dá para aprovar.");
  if (!temImagem) avisos.push("Nenhuma foto encontrada na pasta do produto.");

  return {
    id,
    tituloOriginal,
    tituloReescrito,
    descricaoOriginal,
    textoAchadinho,
    linkAfiliado,
    nicho: json.nicho ? String(json.nicho) : null,
    origem: json.origem ? String(json.origem) : null,
    vendas: numeroOuNulo(json.vendas),
    avaliacao: numeroOuNulo(json.avaliacao),
    comissaoPercentual: numeroOuNulo(json.comissao_percentual),
    precoMin: numeroOuNulo(json.preco_min),
    loja: json.loja ? String(json.loja) : null,
    temImagem,
    textoFinal: montarTextoFinal(tituloReescrito, textoAchadinho || descricaoOriginal, linkAfiliado),
    avisos,
  };
}

export async function listarProdutos(status: Status): Promise<ResultadoListagem> {
  await fs.mkdir(caminho(status), { recursive: true });
  const entradas = await fs.readdir(caminho(status), { withFileTypes: true });
  const pastas = entradas.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const produtos: Produto[] = [];
  const invalidos: { id: string; motivo: string }[] = [];

  for (const id of pastas) {
    if (!idValido(id)) {
      invalidos.push({ id, motivo: "Nome da pasta inválido. Use só letras, números, - e _." });
      continue;
    }
    try {
      produtos.push(await lerProduto(status, id));
    } catch {
      invalidos.push({ id, motivo: "Não foi possível ler produto.json (ausente ou com erro de formato)." });
    }
  }
  return { produtos, invalidos };
}

export async function contarProdutos(status: Status): Promise<number> {
  try {
    const entradas = await fs.readdir(caminho(status), { withFileTypes: true });
    return entradas.filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

export class ErroDeNegocio extends Error {
  constructor(message: string, public codigo: number) {
    super(message);
  }
}

/** Move a pasta do produto de /pendentes para /aprovados ou /rejeitados. */
export async function decidirProduto(
  id: string,
  acao: "aprovar" | "rejeitar"
): Promise<{ destino: Status; idFinal: string }> {
  if (!idValido(id)) throw new ErroDeNegocio("Identificador de produto inválido.", 400);

  const origem = caminho("pendentes", id);
  try {
    await fs.access(origem);
  } catch {
    throw new ErroDeNegocio("Produto não encontrado em /pendentes (talvez já tenha sido movido).", 404);
  }

  const destinoStatus: Status = acao === "aprovar" ? "aprovados" : "rejeitados";

  if (acao === "aprovar") {
    const produto = await lerProduto("pendentes", id).catch(() => null);
    if (!produto) throw new ErroDeNegocio("produto.json inválido. Corrija antes de aprovar.", 422);
    if (!produto.tituloReescrito || !(produto.textoAchadinho || produto.descricaoOriginal)) {
      throw new ErroDeNegocio("Só é possível aprovar com título reescrito e texto preenchidos.", 422);
    }
    if (!produto.linkAfiliado) {
      throw new ErroDeNegocio("Só é possível aprovar com link de afiliado (link_afiliado).", 422);
    }
    // Guarda o texto pronto para publicar: texto original + link, terminando em #afiliado.
    await fs.writeFile(path.join(origem, "publicacao.txt"), produto.textoFinal + "\n", "utf-8");
  }

  await fs.mkdir(caminho(destinoStatus), { recursive: true });
  let idFinal = id;
  try {
    await fs.access(caminho(destinoStatus, id));
    idFinal = `${id}-${Date.now()}`; // evita sobrescrever
  } catch {
    /* destino livre */
  }
  await fs.rename(origem, caminho(destinoStatus, idFinal));
  return { destino: destinoStatus, idFinal };
}
