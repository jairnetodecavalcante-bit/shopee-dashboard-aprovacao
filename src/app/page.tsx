import PainelAutomacao from "@/components/PainelAutomacao";
import ProductCard from "@/components/ProductCard";
import { contarProdutos, listarProdutos } from "@/lib/produtos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ produtos, invalidos }, aprovados, rejeitados] = await Promise.all([
    listarProdutos("pendentes"),
    contarProdutos("aprovados"),
    contarProdutos("rejeitados"),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-linha pb-5">
        <div>
          <h1 className="text-2xl font-bold">Produtos para aprovar</h1>
          <p className="mt-1 text-sm text-suave">
            Cada publicação leva o texto original, o link e termina com{" "}
            <span className="font-semibold text-shopee">#afiliado</span>.
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-suave">Pendentes</dt>
            <dd className="text-lg font-semibold">{produtos.length + invalidos.length}</dd>
          </div>
          <div>
            <dt className="text-suave">Aprovados</dt>
            <dd className="text-lg font-semibold text-aprovar">{aprovados}</dd>
          </div>
          <div>
            <dt className="text-suave">Rejeitados</dt>
            <dd className="text-lg font-semibold text-rejeitar">{rejeitados}</dd>
          </div>
        </dl>
      </header>

      <PainelAutomacao />

      {invalidos.length > 0 && (
        <section className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <h2 className="font-semibold">Pastas que não puderam ser lidas</h2>
          <ul className="mt-2 list-disc pl-5">
            {invalidos.map((i) => (
              <li key={i.id}>
                <code>pendentes/{i.id}</code>: {i.motivo}
              </li>
            ))}
          </ul>
        </section>
      )}

      {produtos.length === 0 ? (
        <section className="rounded-lg border border-dashed border-linha bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">Nenhum produto pendente</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-suave">
            Clique em “Garimpar agora” ou aguarde a próxima rodada automática. Também dá para criar uma
            pasta dentro de <code>pendentes/</code> com <code>produto.json</code> e uma foto (veja o README).
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {produtos.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      )}
    </main>
  );
}
