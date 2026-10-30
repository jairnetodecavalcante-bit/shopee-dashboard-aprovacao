import { config } from "./config";
import type { Oferta } from "./shopee";

export type Reescrita = {
  titulo: string;
  gancho: string;
  beneficios: [string, string];
  atencao: string;
};

const SISTEMA = `Você escreve posts de "achadinhos" da Shopee para um perfil brasileiro de público jovem.

Estilo: português do Brasil, leve, descontraído, como quem conta um achado para uma amiga ("achei esse achado que..."). No máximo 2 emojis no total.

REGRAS DE HONESTIDADE (obrigatórias):
- Use SOMENTE as informações fornecidas (nome do produto, preço, nota, quantidade vendida, loja). Você não tem a descrição completa do produto.
- Os 2 benefícios devem ser verdadeiros e verificáveis a partir dessas informações: o que o nome do produto diz (ex.: quantidade de peças, tipo, tamanho citado) ou a prova social (nota alta, muitas vendas). Nunca invente material, medida, tecido, ingrediente, bateria, garantia, certificação ou resultado.
- O ponto de atenção deve ser real e prudente (ex.: conferir tamanho/tom/variação antes de comprar, ler as avaliações, preço pode mudar, resultado varia de pessoa para pessoa).
- Em beleza, skincare, cuidados pessoais e fitness: NÃO prometa resultado, cura, tratamento, emagrecimento, clareamento nem efeito médico.
- Não copie o título original: reescreva com suas palavras, curto (até 70 caracteres), sem CAPS LOCK, sem nome de loja e sem repetição de palavras-chave.
- Não escreva link nem hashtag (o sistema acrescenta).
- Não cite desconto ou preço a menos que tenha sido informado.

Responda APENAS com JSON válido, sem texto antes ou depois, neste formato:
{"titulo":"...","gancho":"frase curta começando com algo como 'Achei esse achado que...'","beneficios":["benefício 1","benefício 2"],"atencao":"ponto de atenção"}`;

function descreverOferta(o: Oferta, nicho: string): string {
  const preco =
    o.precoMin && o.precoMax && o.precoMin !== o.precoMax
      ? `R$ ${o.precoMin.toFixed(2)} a R$ ${o.precoMax.toFixed(2)}`
      : `R$ ${(o.precoMin || o.precoMax).toFixed(2)}`;
  return [
    `Nicho: ${nicho}`,
    `Nome na Shopee: ${o.nome}`,
    `Preço: ${preco}`,
    o.descontoPercentual ? `Desconto informado: ${o.descontoPercentual}%` : null,
    `Nota média: ${o.avaliacao}`,
    `Vendidos: ${o.vendas}`,
    `Loja: ${o.loja}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extrairJson(texto: string): unknown {
  const limpo = texto.replace(/```json|```/g, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim < ini) throw new Error("A IA não devolveu JSON.");
  return JSON.parse(limpo.slice(ini, fim + 1));
}

function validar(j: unknown): Reescrita {
  const o = j as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const beneficios = Array.isArray(o.beneficios) ? o.beneficios.map(texto).filter(Boolean) : [];
  const titulo = texto(o.titulo);
  const gancho = texto(o.gancho);
  const atencao = texto(o.atencao);
  if (!titulo || !gancho || !atencao || beneficios.length !== 2) {
    throw new Error("Resposta da IA incompleta (precisa de título, gancho, 2 benefícios e 1 atenção).");
  }
  const todo = `${titulo} ${gancho} ${beneficios.join(" ")} ${atencao}`.toLowerCase();
  if (todo.includes("http") || todo.includes("#")) {
    throw new Error("A IA incluiu link ou hashtag no texto.");
  }
  return { titulo, gancho, beneficios: [beneficios[0], beneficios[1]], atencao };
}

export async function reescrever(oferta: Oferta, nichoNome: string): Promise<Reescrita> {
  const chave = config.anthropicKey();
  if (!chave) throw new Error("ANTHROPIC_API_KEY não configurada.");

  let ultimoErro: unknown;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const resposta = await fetch(config.anthropicUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": chave,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.anthropicModel(),
          max_tokens: 600,
          system: SISTEMA,
          messages: [{ role: "user", content: descreverOferta(oferta, nichoNome) }],
        }),
        signal: AbortSignal.timeout(40_000),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(`Anthropic API (${resposta.status}): ${dados?.error?.message ?? "erro"}`);
      }
      const bloco = (dados.content as { type: string; text?: string }[] | undefined)?.find(
        (b) => b.type === "text"
      );
      return validar(extrairJson(bloco?.text ?? ""));
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error("Falha ao reescrever.");
}

/** Monta o corpo do post: gancho + 2 benefícios + 1 atenção (link e #afiliado entram depois). */
export function montarTextoAchadinho(r: Reescrita): string {
  return [r.gancho, "", `✅ ${r.beneficios[0]}`, `✅ ${r.beneficios[1]}`, `⚠️ Atenção: ${r.atencao}`].join("\n");
}
