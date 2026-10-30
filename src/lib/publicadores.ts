import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { registrarLog } from "./estado";

const EXT_FOTO_TELEGRAM: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type Pacote = {
  id: string;
  texto: string;
  link: string | null;
  nicho: string | null;
  imagemUrl: string | null;
  foto: { nome: string; tipo: string; dados: Buffer } | null;
};

async function carregarPacote(id: string): Promise<Pacote> {
  const pasta = path.join(process.cwd(), "aprovados", id);
  const texto = (await fs.readFile(path.join(pasta, "publicacao.txt"), "utf-8")).trim();
  const json = JSON.parse(await fs.readFile(path.join(pasta, "produto.json"), "utf-8"));

  let foto: Pacote["foto"] = null;
  for (const nome of await fs.readdir(pasta)) {
    const tipo = EXT_FOTO_TELEGRAM[path.extname(nome).toLowerCase()];
    if (tipo) {
      foto = { nome, tipo, dados: await fs.readFile(path.join(pasta, nome)) };
      break;
    }
  }
  return {
    id,
    texto,
    link: json.link_afiliado ?? null,
    nicho: json.nicho ?? null,
    imagemUrl: json.imagem_url ?? null,
    foto,
  };
}

async function postarTelegram(p: Pacote): Promise<void> {
  const token = config.telegramToken();
  const chat = config.telegramChat();
  if (!token || !chat) throw new Error("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados.");
  const base = `https://api.telegram.org/bot${token}`;

  async function enviar(metodo: string, corpo: FormData | string, json = false) {
    const r = await fetch(`${base}/${metodo}`, {
      method: "POST",
      headers: json ? { "Content-Type": "application/json" } : undefined,
      body: corpo,
      signal: AbortSignal.timeout(30_000),
    });
    const dados = (await r.json()) as { ok?: boolean; description?: string };
    if (!dados.ok) throw new Error(`Telegram: ${dados.description ?? `HTTP ${r.status}`}`);
  }

  const mensagem = () => enviar("sendMessage", JSON.stringify({ chat_id: chat, text: p.texto }), true);

  if (!p.foto) return mensagem();

  const form = new FormData();
  form.append("chat_id", chat);
  form.append("photo", new Blob([new Uint8Array(p.foto.dados)], { type: p.foto.tipo }), p.foto.nome);
  const cabeNaLegenda = p.texto.length <= 1024;
  if (cabeNaLegenda) form.append("caption", p.texto);
  await enviar("sendPhoto", form);
  if (!cabeNaLegenda) await mensagem();
}

async function postarWebhook(p: Pacote): Promise<void> {
  const url = config.webhookUrl();
  if (!url) throw new Error("WEBHOOK_URL não configurada.");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: p.id,
      texto: p.texto,
      link: p.link,
      nicho: p.nicho,
      imagem_url: p.imagemUrl,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`Webhook respondeu HTTP ${r.status}.`);
}

async function postarSimulado(p: Pacote): Promise<void> {
  const linha = `[${new Date().toISOString()}] ${p.id}\n${p.texto}\n---`;
  console.log(`[postagem simulada] ${p.id}`);
  await registrarLog("postagens-simuladas.log", linha);
}

/** Publica o produto aprovado no canal configurado em PUBLICADOR. Devolve o nome do canal. */
export async function publicar(id: string): Promise<string> {
  const pacote = await carregarPacote(id);
  const canal = config.publicador();
  if (canal === "telegram") await postarTelegram(pacote);
  else if (canal === "webhook") await postarWebhook(pacote);
  else if (canal === "simulado") await postarSimulado(pacote);
  else throw new Error(`PUBLICADOR="${canal}" inválido. Use simulado, telegram ou webhook.`);
  return canal;
}
