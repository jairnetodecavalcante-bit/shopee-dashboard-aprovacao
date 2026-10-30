export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { iniciarAgendador } = await import("./lib/agendador");
    iniciarAgendador();
  }
}
