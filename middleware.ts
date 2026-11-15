import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Rotas privadas. O perfil público do vendedor (/vendedor/[id]) NÃO entra aqui —
// é acessível a qualquer visitante. Apenas o painel do vendedor exige sessão.
export const config = {
  matcher: ["/mapa/:path*", "/conta/:path*", "/vendedor/painel/:path*"],
};
