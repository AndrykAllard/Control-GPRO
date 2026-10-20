import json,sys,datetime
import os
S=os.path.join(os.path.dirname(os.path.abspath(__file__)),'src')+'/'
r=lambda f:open(S+f).read()
css=r('base.css').replace('tbody tr:nth-child(odd) td{background:var(--zebra)}\n','').replace('tbody tr:nth-child(even) td{background:var(--white)}\n','')
css=css.replace('th.c-del{width:64px}','th.c-del{width:84px}')
css+=r('extra.css')+'</style>\n'
app=r('app.js').replace('/*@XLSXW@*/',r('xlsxw.js'))
body=r('body.html')
title='<title>Control Entregables GPRO</title>\n'
# artifact
art=title+css+'\n'+body.replace('<!--@DLBTN@-->','')+'\n<script>\n'+app+'\n'+r('boot_db.js')+'\n</script>\n'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'artifact.html'),'w').write(art)
# local export
data=json.load(open(S+'data.json'))
data['exportado']=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
loc=('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
 +title+css+'<style>body{margin:0}</style>\n</head>\n<body>\n<script id="datos" type="application/json">'+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+'</script>\n'
 +body.replace('<!--@DLBTN@-->','<button class="btn-ghost" id="dlBtn" title="Descarga este archivo con los datos actuales">⤓ Guardar copia</button>')
 +'\n<script>\n'+app+'\n'+r('boot_local.js')+'\n</script>\n</body>\n</html>\n')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'index.html'),'w').write(loc)
print('ok',len(art),len(loc))
