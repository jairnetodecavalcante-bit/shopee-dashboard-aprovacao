"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GarimparAgora() {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function garimpar() {
    setRodando(true);
    setMensagem(null);
    try {
      const r = await fetch("/api/garimpo", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro ?? "Falha no garimpo.");
      if (d.erro) {
        setMensagem({ tipo: "erro", texto: d.erro });
      } else {
        setMensagem({
          tipo: "ok",
          texto: `${d.nicho} (“${d.palavra}”): ${d.salvos} produto(s) novo(s) em pendentes, de ${d.encontrados} que passaram nos filtros.`,
        });
      }
      router.refresh();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro desconhecido." });
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={garimpar}
        disabled={rodando}
        className="rounded-md bg-tinta px-4 py-2 text-sm font-semibold text-white hover:bg-tinta/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:cursor-not-allowed disabled:opacity-50"
      >
        {rodando ? "Garimpando… (pode levar alguns minutos)" : "Garimpar agora"}
      </button>
      {mensagem && (
        <p
          role={mensagem.tipo === "erro" ? "alert" : "status"}
          className={`text-sm ${mensagem.tipo === "erro" ? "text-rejeitar" : "text-aprovar"}`}
        >
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
