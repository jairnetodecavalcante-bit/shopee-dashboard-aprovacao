"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReenviarFila({ id }: { id: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  return (
    <button
      type="button"
      disabled={carregando}
      onClick={async () => {
        setCarregando(true);
        await fetch("/api/fila", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        router.refresh();
        setCarregando(false);
      }}
      className="rounded border border-linha px-2 py-1 text-xs font-medium hover:bg-fundo disabled:opacity-50"
    >
      Tentar de novo
    </button>
  );
}
