function num(nome: string, padrao: number): number {
  const v = Number(process.env[nome]);
  return Number.isFinite(v) && process.env[nome] !== "" && process.env[nome] !== undefined ? v : padrao;
}

export const config = {
  shopeeEndpoint: () =>
    process.env.SHOPEE_ENDPOINT || "https://open-api.affiliate.shopee.com.br/graphql",
  shopeeAppId: () => process.env.SHOPEE_APP_ID?.trim() ?? "",
  shopeeSecret: () => process.env.SHOPEE_APP_SECRET?.trim() ?? "",
  anthropicKey: () => process.env.ANTHROPIC_API_KEY?.trim() ?? "",
  anthropicUrl: () => process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages",
  anthropicModel: () => process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
  agendadorAtivo: () => process.env.AGENDADOR_ATIVO !== "false",
  garimpoIntervaloHoras: () => num("GARIMPO_INTERVALO_HORAS", 6),
  produtosPorRodada: () => num("PRODUTOS_POR_RODADA", 5),
  minVendas: () => num("MIN_VENDAS", 200),
  minAvaliacao: () => num("MIN_AVALIACAO", 4.7),
  minComissao: () => num("MIN_COMISSAO_PERCENTUAL", 5) / 100,
  maxPaginas: () => num("MAX_PAGINAS", 4),
  publicador: () => (process.env.PUBLICADOR || "simulado").toLowerCase(),
  intervaloPostagemHoras: () => num("INTERVALO_POSTAGEM_HORAS", 2),
  telegramToken: () => process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
  telegramChat: () => process.env.TELEGRAM_CHAT_ID?.trim() ?? "",
  webhookUrl: () => process.env.WEBHOOK_URL?.trim() ?? "",
  fuso: () => process.env.FUSO_HORARIO || "America/Boa_Vista",
};

/** Lista o que ainda falta configurar, para mostrar no painel. */
export function diagnostico(): string[] {
  const falta: string[] = [];
  if (!config.shopeeAppId() || !config.shopeeSecret())
    falta.push("Preencha SHOPEE_APP_ID e SHOPEE_APP_SECRET no .env.local para o garimpo buscar produtos.");
  if (!config.anthropicKey())
    falta.push("Preencha ANTHROPIC_API_KEY no .env.local para reescrever título e texto.");
  const p = config.publicador();
  if (p === "telegram" && (!config.telegramToken() || !config.telegramChat()))
    falta.push("PUBLICADOR=telegram precisa de TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.");
  if (p === "webhook" && !config.webhookUrl()) falta.push("PUBLICADOR=webhook precisa de WEBHOOK_URL.");
  if (!["simulado", "telegram", "webhook"].includes(p))
    falta.push(`PUBLICADOR="${p}" não existe. Use simulado, telegram ou webhook.`);
  return falta;
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: config.fuso(),
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
