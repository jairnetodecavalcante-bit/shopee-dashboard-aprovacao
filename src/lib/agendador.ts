import { config } from "./config";
import { lerEstado, comTrava } from "./estado";
import { executarGarimpo, garimpoEmAndamento } from "./garimpo";
import { processarFila } from "./fila";

const g = globalThis as { __agendadorIniciado?: boolean };

const UM_MINUTO = 60_000;
const RETENTAR_APOS_ERRO_MS = 30 * 60_000;

/** Devolve quando o próximo garimpo deve acontecer (ISO) ou null se já está na hora. */
export async function proximoGarimpoEm(): Promise<string | null> {
  const e = await comTrava(() => lerEstado());
  if (!e.ultimoGarimpo) return null;
  const espera = e.ultimoGarimpo.erro ? RETENTAR_APOS_ERRO_MS : config.garimpoIntervaloHoras() * 3_600_000;
  return new Date(new Date(e.ultimoGarimpo.em).getTime() + espera).toISOString();
}

async function verificarGarimpo() {
  if (garimpoEmAndamento()) return;
  if (!config.shopeeAppId() || !config.shopeeSecret() || !config.anthropicKey()) return;
  const proximo = await proximoGarimpoEm();
  if (proximo && Date.now() < new Date(proximo).getTime()) return;
  console.log("[garimpo] iniciando rodada automática");
  const r = await executarGarimpo("agendado");
  console.log(
    `[garimpo] ${r.nicho} ("${r.palavra}"): ${r.salvos} salvos de ${r.encontrados} elegíveis${r.erro ? ` | erro: ${r.erro}` : ""}`
  );
}

export function iniciarAgendador() {
  if (g.__agendadorIniciado) return;
  g.__agendadorIniciado = true;
  if (!config.agendadorAtivo()) {
    console.log("[agendador] desativado (AGENDADOR_ATIVO=false)");
    return;
  }
  console.log("[agendador] ligado: garimpo a cada " + config.garimpoIntervaloHoras() + "h e fila de postagens");

  const seguro = (nome: string, fn: () => Promise<void>) => () =>
    fn().catch((e) => console.error(`[${nome}]`, e instanceof Error ? e.message : e));

  setInterval(seguro("fila", processarFila), 30_000);
  setInterval(seguro("garimpo", verificarGarimpo), UM_MINUTO);
  setTimeout(seguro("garimpo", verificarGarimpo), 15_000);
}
