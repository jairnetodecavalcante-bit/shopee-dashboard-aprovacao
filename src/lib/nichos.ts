export type Nicho = { slug: string; nome: string; palavras: string[] };

/**
 * Nichos do rodízio (um por rodada, na ordem abaixo).
 * Em cada rodada o nicho usa a próxima palavra-chave da lista, para variar os resultados.
 * Edite à vontade.
 */
export const NICHOS: Nicho[] = [
  {
    slug: "moda-feminina",
    nome: "Moda feminina",
    palavras: ["vestido feminino", "blusa feminina", "conjunto feminino", "legging feminina", "bolsa feminina"],
  },
  {
    slug: "beleza",
    nome: "Beleza",
    palavras: ["maquiagem", "batom", "base facial", "paleta de sombras", "pincel de maquiagem"],
  },
  {
    slug: "cuidados-pessoais",
    nome: "Cuidados pessoais",
    palavras: ["escova secadora", "chapinha", "kit manicure", "escova dental eletrica", "depilador"],
  },
  {
    slug: "skincare",
    nome: "Skincare",
    palavras: ["protetor solar facial", "hidratante facial", "serum facial", "sabonete facial", "mascara facial"],
  },
  {
    slug: "fitness",
    nome: "Fitness",
    palavras: ["faixa elastica exercicio", "garrafa academia", "corda de pular", "tapete yoga", "munhequeira"],
  },
  {
    slug: "utilidades-domesticas",
    nome: "Utilidades domésticas",
    palavras: ["organizador cozinha", "pote hermetico", "porta temperos", "tapete cozinha", "escorredor de loucas"],
  },
];

export function catIdDoNicho(slug: string): number | null {
  const v = Number(process.env[`CAT_ID_${slug.toUpperCase().replace(/-/g, "_")}`]);
  return Number.isFinite(v) && v > 0 ? v : null;
}
