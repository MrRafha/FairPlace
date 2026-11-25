import { withAuth } from "next-auth/middleware";

// Next 16: a convenção `middleware` foi renomeada para `proxy` e o arquivo
// precisa ficar no mesmo nível de `app` (aqui, em src/). Na raiz do projeto
// ele era ignorado e as rotas abaixo ficavam públicas.
export const proxy = withAuth({
  pages: {
    signIn: "/login",
  },
});

// Rotas privadas. O perfil público do vendedor (/vendedor/[id]) NÃO entra aqui —
// é acessível a qualquer visitante. As páginas também checam a sessão por conta
// própria (defesa em profundidade).
export const config = {
  matcher: ["/mapa/:path*", "/conta/:path*", "/vendedor/painel/:path*"],
};
