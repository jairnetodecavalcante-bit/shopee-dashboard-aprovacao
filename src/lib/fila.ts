import { config } from "./config";
import { comTrava, gravarFila, lerFila, type ItemFila } from "./estado";
import { publicar } from "./publicadores";

const MAX_TENTATIVAS = 3;
const REPETIR_APOS_ERRO_MS = 10 * 60 * 1000;

function ms(iso: string) {
  return new Date(iso).getTime();
}

function ultimoHorario(fila: ItemFila[]): number | null {
  const tempos = fila
    .filter((i) => i.status !== "erro")
    .map((i) => ms(i.postadoEm ?? i.agendadoPara));
  return tempos.length ? Math.max(...tempos) : null;
}

/** Agenda a postagem: no mínimo INTERVALO_POSTAGEM_HORAS depois da última (postada ou agendada). */
export function agendarPostagem(id: string): Promise<ItemFila> {
  return comTrava(async () => {
    const fila = await lerFila();
    const existente = fila.find((i) => i.id === id && i.status === "agendado");
    if (existente) return existente;

    const intervalo = config.intervaloPostagemHoras() * 3_600_000;
    const ultimo = ultimoHorario(fila);
    const quando = Math.max(Date.now(), ultimo === null ? 0 : ultimo + intervalo);
    const item: ItemFila = {
      id,
      agendadoPara: new Date(quando).toISOString(),
      status: "agendado",
      tentativas: 0,
    };
    fila.push(item);
    await gravarFila(fila);
    return item;
  });
}

/** Chamado a cada 30 s: publica no máximo 1 item vencido, respeitando o intervalo mínimo. */
export function processarFila(): Promise<void> {
  return comTrava(async () => {
    const fila = await lerFila();
    const agora = Date.now();
    const vencido = fila
      .filter((i) => i.status === "agendado" && ms(i.agendadoPara) <= agora)
      .sort((a, b) => ms(a.agendadoPara) - ms(b.agendadoPara))[0];
    if (!vencido) return;

    const intervalo = config.intervaloPostagemHoras() * 3_600_000;
    const ultimoPostado = Math.max(0, ...fila.filter((i) => i.postadoEm).map((i) => ms(i.postadoEm!)));
    if (ultimoPostado && agora < ultimoPostado + intervalo) {
      // Servidor ficou desligado e vários venceram juntos: respeita o intervalo
      // e escalona os atrasados de 2 em 2 horas, na ordem original.
      const atrasados = fila
        .filter((i) => i.status === "agendado" && ms(i.agendadoPara) <= agora)
        .sort((a, b) => ms(a.agendadoPara) - ms(b.agendadoPara));
      let horario = ultimoPostado + intervalo;
      for (const a of atrasados) {
        a.agendadoPara = new Date(horario).toISOString();
        horario += intervalo;
      }
      await gravarFila(fila);
      return;
    }

    try {
      vencido.canal = await publicar(vencido.id);
      vencido.status = "postado";
      vencido.postadoEm = new Date().toISOString();
      delete vencido.erro;
    } catch (e) {
      vencido.tentativas += 1;
      vencido.erro = e instanceof Error ? e.message : "Erro ao publicar.";
      if (vencido.tentativas >= MAX_TENTATIVAS) vencido.status = "erro";
      else vencido.agendadoPara = new Date(agora + REPETIR_APOS_ERRO_MS).toISOString();
      console.error(`[fila] falha ao postar ${vencido.id}: ${vencido.erro}`);
    }
    await gravarFila(fila);
  });
}

/** Tenta de novo um item que esgotou as tentativas. */
export function reenfileirar(id: string): Promise<void> {
  return comTrava(async () => {
    const fila = await lerFila();
    const item = fila.find((i) => i.id === id && i.status === "erro");
    if (!item) return;
    item.status = "agendado";
    item.tentativas = 0;
    item.agendadoPara = new Date().toISOString();
    await gravarFila(fila);
  });
}

export async function listarFila(): Promise<ItemFila[]> {
  const fila = await comTrava(() => lerFila());
  return fila.sort((a, b) => ms(b.agendadoPara) - ms(a.agendadoPara)).slice(0, 30);
}
