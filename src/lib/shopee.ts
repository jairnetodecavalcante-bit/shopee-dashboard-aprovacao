import crypto from "node:crypto";
import { config } from "./config";

export type Oferta = {
  itemId: string;
  shopId: string;
  nome: string;
  imagemUrl: string;
  precoMin: number;
  precoMax: number;
  descontoPercentual: number | null;
  avaliacao: number;
  vendas: number;
  comissao: number; // decimal: 0.05 = 5%
  linkAfiliado: string;
  linkProduto: string;
  loja: string;
};

type NoApi = Record<string, unknown>;

const CAMPOS =
  "itemId shopId productName imageUrl priceMin priceMax priceDiscountRate ratingStar sales commissionRate offerLink productLink shopName";

/** sortType 2 = mais vendidos (ITEM_SOLD_DESC). */
const ORDENAR_POR_VENDAS = 2;

function montarQuery(args: { palavra?: string; catId?: number | null; pagina: number; limite: number }) {
  const partes: string[] = [`sortType:${ORDENAR_POR_VENDAS}`, `page:${args.pagina}`, `limit:${args.limite}`];
  if (args.palavra) partes.push(`keyword:${JSON.stringify(args.palavra)}`);
  if (args.catId) partes.push(`productCatId:${args.catId}`);
  return `{ productOfferV2(${partes.join(", ")}) { nodes { ${CAMPOS} } pageInfo { page limit hasNextPage } } }`;
}

async function chamar(query: string): Promise<unknown> {
  const appId = config.shopeeAppId();
  const secret = config.shopeeSecret();
  if (!appId || !secret) throw new Error("SHOPEE_APP_ID/SHOPEE_APP_SECRET não configurados.");

  const payload = JSON.stringify({ query });
  const timestamp = Math.floor(Date.now() / 1000);
  const assinatura = crypto
    .createHash("sha256")
    .update(`${appId}${timestamp}${payload}${secret}`)
    .digest("hex");

  const resposta = await fetch(config.shopeeEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${assinatura}`,
    },
    body: payload,
    signal: AbortSignal.timeout(25_000),
  });

  const texto = await resposta.text();
  let json: { data?: unknown; errors?: { message?: string; extensions?: { code?: number } }[] };
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta inesperada da Shopee (HTTP ${resposta.status}).`);
  }
  if (json.errors?.length) {
    const e = json.errors[0];
    throw new Error(`Shopee API: ${e.message ?? "erro"}${e.extensions?.code ? ` (código ${e.extensions.code})` : ""}`);
  }
  if (!resposta.ok) throw new Error(`Shopee API respondeu HTTP ${resposta.status}.`);
  return json.data;
}

function paraOferta(n: NoApi): Oferta | null {
  const itemId = String(n.itemId ?? "");
  const link = String(n.offerLink ?? "");
  if (!itemId || !link) return null;
  const desconto = Number(n.priceDiscountRate);
  return {
    itemId,
    shopId: String(n.shopId ?? ""),
    nome: String(n.productName ?? "").trim(),
    imagemUrl: String(n.imageUrl ?? ""),
    precoMin: Number(n.priceMin) || 0,
    precoMax: Number(n.priceMax) || 0,
    descontoPercentual: Number.isFinite(desconto) && desconto > 0 ? desconto : null,
    avaliacao: Number(n.ratingStar) || 0,
    vendas: Number(n.sales) || 0,
    comissao: Number(n.commissionRate) || 0,
    linkAfiliado: link,
    linkProduto: String(n.productLink ?? ""),
    loja: String(n.shopName ?? ""),
  };
}

/** Busca páginas de ofertas (mais vendidas primeiro) para uma palavra-chave ou categoria. */
export async function buscarOfertas(args: {
  palavra?: string;
  catId?: number | null;
  maxPaginas: number;
}): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];
  for (let pagina = 1; pagina <= args.maxPaginas; pagina++) {
    const data = (await chamar(montarQuery({ ...args, pagina, limite: 50 }))) as {
      productOfferV2?: { nodes?: NoApi[]; pageInfo?: { hasNextPage?: boolean } };
    };
    const bloco = data?.productOfferV2;
    for (const no of bloco?.nodes ?? []) {
      const o = paraOferta(no);
      if (o) ofertas.push(o);
    }
    if (!bloco?.pageInfo?.hasNextPage) break;
  }
  return ofertas;
}

export function passaNosFiltros(o: Oferta): boolean {
  return (
    o.vendas > config.minVendas() &&
    o.avaliacao > config.minAvaliacao() &&
    o.comissao > config.minComissao()
  );
}
