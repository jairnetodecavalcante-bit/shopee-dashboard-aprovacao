import { config, diagnostico, formatarData } from "@/lib/config";
import { lerEstado } from "@/lib/estado";
import { proximoGarimpoEm } from "@/lib/agendador";
import { listarFila } from "@/lib/fila";
import { NICHOS } from "@/lib/nichos";
import GarimparAgora from "./GarimparAgora";
import ReenviarFila from "./ReenviarFila";

const ROTULO_STATUS = { agendado: "Agendado", postado: "Postado", erro: "Falhou" } as const;

export default async function PainelAutomacao() {
  const [estado, proximo, fila] = await Promise.all([lerEstado(), proximoGarimpoEm(), listarFila()]);
  const problemas = diagnostico();
  const proximoNicho = NICHOS[estado.proximoIndice % NICHOS.length];
  const ultimo = estado.ultimoGarimpo;
  const agendados = fila.filter((f) => f.status === "agendado").length;

  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-linha bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Garimpo automático</h2>
        <p className="mt-1 text-sm text-suave">
          Uma rodada a cada {config.garimpoIntervaloHoras()}h, um nicho por vez. Filtros: mais de{" "}
          {config.minVendas()} vendas, nota acima de {config.minAvaliacao()} e comissão acima de{" "}
          {config.minComissao() * 100}%.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-suave">Próximo nicho</dt>
            <dd className="font-medium">{proximoNicho.nome}</dd>
          </div>
          <div>
            <dt className="text-suave">Próxima rodada</dt>
            <dd className="font-medium">
              {!config.agendadorAtivo() ? "Desligado" : proximo ? formatarData(proximo) : "Na próxima verificação"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-suave">Última rodada</dt>
            <dd className="font-medium">
              {ultimo
                ? `${formatarData(ultimo.em)}: ${ultimo.nicho} (“${ultimo.palavra}”), ${ultimo.salvos} salvos de ${ultimo.encontrados} elegíveis`
                : "Ainda não rodou"}
            </dd>
            {ultimo?.erro && <dd className="mt-1 text-rejeitar">{ultimo.erro}</dd>}
          </div>
        </dl>
        <div className="mt-4">
          <GarimparAgora />
        </div>
      </div>

      <div className="rounded-lg border border-linha bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Fila de postagens</h2>
        <p className="mt-1 text-sm text-suave">
          Canal: <span className="font-medium text-tinta">{config.publicador()}</span> · intervalo de{" "}
          {config.intervaloPostagemHoras()}h entre posts · {agendados} agendado(s)
        </p>
        {fila.length === 0 ? (
          <p className="mt-3 text-sm text-suave">Nada agendado. Ao clicar em APROVAR, o produto entra aqui.</p>
        ) : (
          <ul className="mt-3 max-h-56 divide-y divide-linha overflow-y-auto text-sm">
            {fila.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.id}</p>
                  <p className="text-xs text-suave">
                    {f.status === "postado"
                      ? `Postado em ${formatarData(f.postadoEm)}`
                      : `Sai em ${formatarData(f.agendadoPara)}`}
                    {f.erro ? ` · ${f.erro}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      f.status === "postado"
                        ? "bg-aprovar/10 text-aprovar"
                        : f.status === "erro"
                        ? "bg-rejeitar/10 text-rejeitar"
                        : "bg-fundo text-tinta"
                    }`}
                  >
                    {ROTULO_STATUS[f.status]}
                  </span>
                  {f.status === "erro" && <ReenviarFila id={f.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {problemas.length > 0 && (
        <ul className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 lg:col-span-2">
          {problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
