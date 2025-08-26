<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Mantenimiento del Salón del Reino - Instrucciones para Copilot

Contexto del proyecto:
- Aplicación Next.js (App Router) con TypeScript y Tailwind CSS.
- Funcionalidades: gestión de usuarios con roles, asignación de trabajos y turnos semanales, subida de fotos, y colaboración (comentarios/actualizaciones de estado).

Estándares y guías:
- Usar el directorio `src/` y convenciones de app router (`src/app`).
- Estilo con Tailwind y componentes reutilizables.
- Validación de formularios con Zod y react-hook-form.
- Autenticación con NextAuth y providers de email/password (Credentials) y Google opcional.
- Persistencia con Prisma y una base de datos SQLite en dev, Postgres en prod.
- Subida de imágenes a almacenamiento (ej. Cloudinary) con presets.

Patrones sugeridos:
- Domain: `users`, `tasks`, `assignments`, `photos`, `comments`.
- Carpeta `src/lib` para utilidades (auth, db, validators, cloudinary, etc.).
- UI en `src/components` con diseño accesible.
- API routes en `src/app/api/*` con handlers REST.
- Server Actions donde tenga sentido (mutaciones autenticadas).

Convenciones:
- Alias de importación: `@/*`.
- Estricto con TypeScript.
- ESLint + Prettier (respetar config de eslint-config-next).

