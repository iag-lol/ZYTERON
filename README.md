# Zyteron — Plataforma web premium B2B

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix)
- Prisma + PostgreSQL
- NextAuth (credentials, listo para OAuth)
- React Query

## Scripts
- `npm run dev` — dev server
- `npm run build` — build producción
- `npm run start` — serve producción
- `npm run lint` — lint Next/ESLint
- `npm run format` — Prettier
- `npm run db:generate` — prisma generate
- `npm run db:push` — push schema a DB
- `npm run db:seed` — semillas iniciales

## Variables de entorno
Copia `.env.example` a `.env` y ajusta:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Etapas
1. Arquitectura + base visual + config general (esta rama)
2. Home pública premium y estructura general
3. Servicios, productos, planes y catálogo
4. Constructor de paquetes / cotizador
5. Autenticación y panel cliente
6. Panel administrativo completo
7. SEO técnico completo (metadatos, schema, sitemap, robots, OG/Twitter) y performance
8. Pulido visual, responsive final, UX, detalles premium

## Nota
"No me entregues solo ideas. Quiero código real, estructura real, base de datos real, paneles reales y una implementación seria. Si una parte es muy larga, entrégala por módulos completos sin omitir lógica importante. Prioriza calidad, SEO técnico fuerte, claridad comercial y apariencia premium."
