/* Generador XLSX mínimo (sin librerías): zip sin compresión + SpreadsheetML con estilos */
const XW=(()=>{
  const enc=new TextEncoder();
  const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
  const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
  function zip(files){
    const parts=[],central=[];let off=0;
    for(const [name,str] of files){
      const nm=enc.encode(name),data=enc.encode(str),crc=crc32(data);
      const h=new DataView(new ArrayBuffer(30));
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);
      h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nm.length,true);
      parts.push(new Uint8Array(h.buffer),nm,data);
      const c=new DataView(new ArrayBuffer(46));
      c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);
      c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
      central.push(new Uint8Array(c.buffer),nm);
      off+=30+nm.length+data.length;
    }
    const csize=central.reduce((s,a)=>s+a.length,0);
    const e=new DataView(new ArrayBuffer(22));
    e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csize,true);e.setUint32(16,off,true);
    const all=[...parts,...central,new Uint8Array(e.buffer)],out=new Uint8Array(all.reduce((s,a)=>s+a.length,0));
    let p=0;for(const a of all){out.set(a,p);p+=a.length;}return out;
  }
  const x=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
  const col=n=>{let s="";n++;while(n){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;};
  // estilos: 0 normal · 1 encabezado · 2 completado · 3 en curso · 4 foco · 5 pendiente · 6 número 0.00 · 7 negrita · 8 texto ajustado
  const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="5"><font><sz val="10"/><color rgb="FF253746"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FF253746"/><name val="Arial"/></font><font><sz val="10"/><color rgb="FF8A97A0"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFD22630"/><name val="Arial"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00778B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCEBD3"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFBEFC7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF9D9DB"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFE2E7EA"/></left><right style="thin"><color rgb="FFE2E7EA"/></right><top style="thin"><color rgb="FFE2E7EA"/></top><bottom style="thin"><color rgb="FFE2E7EA"/></bottom></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="9">
<xf fontId="0" fillId="0" borderId="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf fontId="2" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf fontId="4" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf fontId="3" fillId="0" borderId="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf fontId="0" fillId="0" borderId="1" numFmtId="164" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf fontId="2" fillId="0" borderId="1" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
</cellXfs></styleSheet>`;
  function sheetXml(sh){
    const rows=sh.rows.map((r,ri)=>`<row r="${ri+1}"${ri===0&&sh.headerHeight?` ht="${sh.headerHeight}" customHeight="1"`:""}>`+r.map((c,ci)=>{
      if(c==null)return "";const o=typeof c==="object"?c:{v:c};const ref=col(ci)+(ri+1),s=o.s?` s="${o.s}"`:"";
      if(o.v===""||o.v==null)return `<c r="${ref}"${s}/>`;
      return typeof o.v==="number"&&isFinite(o.v)?`<c r="${ref}"${s}><v>${o.v}</v></c>`:`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${x(o.v)}</t></is></c>`;
    }).join("")+`</row>`).join("");
    const cols=sh.cols?`<cols>${sh.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols>`:"";
    const last=col(Math.max(...sh.rows.map(r=>r.length))-1)+sh.rows.length;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${sh.freeze?`<pane xSplit="${sh.freeze[0]}" ySplit="${sh.freeze[1]}" topLeftCell="${col(sh.freeze[0])}${sh.freeze[1]+1}" activePane="bottomRight" state="frozen"/>`:""}</sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData>${sh.filter?`<autoFilter ref="A1:${last}"/>`:""}</worksheet>`;
  }
  function build(sheets){
    const files=[
      ["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
      ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${x(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets>${sheets.map((s,i)=>s.filter?`<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${x(s.name)}'!$A$1:$${col(Math.max(...s.rows.map(r=>r.length))-1)}$${s.rows.length}</definedName></definedNames>`:"").join("")}</workbook>`],
      ["xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/styles.xml",STYLES],
      ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,sheetXml(s)])
    ];
    return zip(files);
  }
  return {build};
})();
