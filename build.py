"""Genera:
  index.html          versión en la nube (Supabase): la que publica GitHub Pages
  local.html          versión sin conexión (datos incluidos, guarda en el navegador)
  artifact.html       versión para el artifact de claude.ai (no se sube al repo)
  supabase/seed.sql   datos iniciales para cargar en Supabase
Uso: python3 build.py   (opcional: EXPORTADO=2026-10-08T15:04:48Z python3 build.py)
"""
import json, datetime, os
D = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(D, 'src') + '/'
r = lambda f: open(S + f, encoding='utf-8').read()
w = lambda f, s: open(os.path.join(D, f), 'w', encoding='utf-8').write(s)

css = r('base.css').replace('tbody tr:nth-child(odd) td{background:var(--zebra)}\n', '').replace('tbody tr:nth-child(even) td{background:var(--white)}\n', '')
css = css.replace('th.c-del{width:64px}', 'th.c-del{width:84px}')
css += r('extra.css') + '</style>\n'
app = r('app.js').replace('/*@XLSXW@*/', r('xlsxw.js'))
body = r('body.html')
title = '<title>Control Entregables GPRO</title>\n'
head = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
DLBTN = '<button class="btn-ghost" id="dlBtn" title="Descarga este archivo con los datos actuales">⤓ Guardar copia</button>'

# artifact (base de datos de claude.ai)
w('artifact.html', title + css + '\n' + body.replace('<!--@DLBTN@-->', '') + '\n<script>\n' + app + '\n' + r('boot_db.js') + '\n</script>\n')

# local (sin conexión)
data = json.load(open(S + 'data.json', encoding='utf-8'))
data['exportado'] = os.environ.get('EXPORTADO') or datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
w('local.html', head + title + css + '<style>body{margin:0}</style>\n</head>\n<body>\n<script id="datos" type="application/json">'
  + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + '</script>\n'
  + body.replace('<!--@DLBTN@-->', DLBTN) + '\n<script>\n' + app + '\n' + r('boot_local.js') + '\n</script>\n</body>\n</html>\n')

# nube (Supabase) → index.html
w('index.html', head + title + css + '<style>body{margin:0}</style>\n'
  + '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</head>\n<body>\n'
  + body.replace('<!--@DLBTN@-->', '') + '\n<script>\n' + r('supa_config.js') + '\n' + app + '\n' + r('boot_supa.js') + '\n</script>\n</body>\n</html>\n')

# semilla SQL (no pisa datos existentes)
rows = []
for col in ('proyectos', 'iniciativas', 'ajustes', 'costos'):
    for o in data.get(col, []):
        d = {k: v for k, v in o.items() if k != 'id'}
        j = json.dumps(d, ensure_ascii=False)
        assert '$j$' not in j
        rows.append(f"('{col}','{o['id']}',$j${j}$j$::jsonb)")
os.makedirs(os.path.join(D, 'supabase'), exist_ok=True)
w('supabase/seed.sql', '-- Datos iniciales Control GPRO (cartera C3 2027 + costos Canales F2). No pisa filas existentes.\n'
  'insert into public.gpro_docs (coleccion,id,data) values\n' + ',\n'.join(rows) + '\non conflict (coleccion,id) do nothing;\n')
print('ok')
