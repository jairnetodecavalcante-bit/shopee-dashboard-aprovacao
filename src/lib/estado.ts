import fs from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "data");

export type UltimoGarimpo = {
  em: string;
  origem: "agendado" | "manual";
  nicho: string;
  palavra: string;
  encontrados: number;
  salvos: number;
  erro?: string;
};

export type Estado = {
  proximoIndice: number;
  rodadasPorNicho: Record<string, number>;
  vistos: string[];
  ultimoGarimpo: UltimoGarimpo | null;
};

export type ItemFila = {
  id: string;
  agendadoPara: string;
  status: "agendado" | "postado" | "erro";
  tentativas: number;
  erro?: string;
  postadoEm?: string;
  canal?: string;
};

const ESTADO_PADRAO: Estado = { proximoIndice: 0, rodadasPorNicho: {}, vistos: [], ultimoGarimpo: null };

let travaAtual: Promise<unknown> = Promise.resolve();

/** Executa as operações de arquivo uma de cada vez, evitando gravações simultâneas. */
export function comTrava<T>(fn: () => Promise<T>): Promise<T> {
  const r = travaAtual.then(() => fn());
  travaAtual = r.catch(() => undefined);
  return r;
}

async function ler<T>(arquivo: string, padrao: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, arquivo), "utf-8")) as T;
  } catch {
    return structuredClone(padrao);
  }
}

async function gravar(arquivo: string, dados: unknown): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const destino = path.join(DIR, arquivo);
  const tmp = `${destino}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(dados, null, 2), "utf-8");
  await fs.rename(tmp, destino);
}

export const lerEstado = () => ler<Estado>("estado.json", ESTADO_PADRAO);
export const gravarEstado = (e: Estado) => gravar("estado.json", e);
export const lerFila = () => ler<ItemFila[]>("fila.json", []);
export const gravarFila = (f: ItemFila[]) => gravar("fila.json", f);

export async function registrarLog(arquivo: string, linha: string): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.appendFile(path.join(DIR, arquivo), linha + "\n", "utf-8");
}
