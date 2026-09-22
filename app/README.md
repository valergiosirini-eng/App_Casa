# App Casa · PWA (Next.js 16 + Supabase)

## Probar en el ordenador
1. `npm install`
2. `npm run dev` y abre http://localhost:3000 (la conexión con Supabase ya va en `lib/supabase.ts`).

## Publicar
Sube la carpeta a GitHub; Vercel despliega solo en cada commit. En el iPhone: Safari → Compartir → Añadir a pantalla de inicio.

## Pantallas (v0.2)
- **Inicio**: libre para gastar y €/día, un aviso a la vez (repartir → sobre pasado → transferencias), tus sobres, resumen de Casa.
- **Apuntar gasto**: color → importe → *pagado con* (tu cuenta, efectivo o la conjunta). Si pagas algo de Casa con tu cuenta, Casa te lo debe.
- **Guardado**: refuerzo de color; si te pasas, propone compensar con el sobre más holgado (un toque).
- **Casa**: presupuesto vs real de cada sobre compartido.
- **Cuentas**: Balance (tú / Casa, Activo = Pasivo + Patrimonio, liquidar deudas con Casa), Previsto vs real, Controles + conciliación bancaria, Diario de asientos. Enlace a Hucha.
- **Reparto**, **Transferencias**, **Historial**, **Sobres** (solo lectura).
