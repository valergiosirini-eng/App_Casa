# App Casa · PWA (Next.js 16 + Supabase)

## Probar en el ordenador
1. `npm install`
2. Copia `env.ejemplo.txt` como `.env.local`
3. `npm run dev` y abre http://localhost:3000

## Publicar en Vercel
1. Sube la carpeta `app/` a un repositorio de GitHub.
2. En Vercel: Add New → Project → importa el repositorio (Framework: Next.js; si el repo es la carpeta entera del proyecto, pon Root Directory = `app`).
3. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (los valores de `env.ejemplo.txt`).
4. Deploy. En el iPhone: abre la URL en Safari → Compartir → Añadir a pantalla de inicio → abre la app desde el icono e inicia sesión.

## Pantallas (v0.1)
Login · Inicio · Apuntar gasto · Guardado · Reparto (cerrar mes, cobrar, repartir) · Transferencias · Historial · Hucha · Sobres (solo lectura).
Pendiente: editar sobres y hucha desde la app, notificaciones push y aviso de la mañana (n8n), onboarding de la pareja.
