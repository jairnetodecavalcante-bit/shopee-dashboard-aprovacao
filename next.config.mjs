/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Permite iniciar o agendador (garimpo + fila de postagens) junto com o servidor.
    instrumentationHook: true,
  },
};

export default nextConfig;
