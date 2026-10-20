/* Conexión a Supabase. La "anon/publishable key" es pública por diseño: el acceso real lo controlan
   el login por correo y las reglas RLS de supabase/setup.sql (solo correos de gpro_miembros). */
const SUPA={url:"",key:""};
