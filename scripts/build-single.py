# -*- coding: utf-8 -*-
"""Assemble dist-single/ + public/img en UN fichier HTML autonome (aperçu hors ligne).
Usage :  npx vite build -c vite.single.config.ts && python3 scripts/build-single.py
"""
import base64, glob, io, json, os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(os.path.dirname(ROOT), os.environ.get("APERCU", "yves-store-apercu-2.html"))
MAXW, Q = 820, 70

imgs = {}
for f in sorted(glob.glob(os.path.join(ROOT, "public", "img", "**", "*.webp"), recursive=True)):
    key = "/" + os.path.relpath(f, os.path.join(ROOT, "public")).replace(os.sep, "/")
    im = Image.open(f)
    w = 1400 if key.endswith("hero.webp") else MAXW
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=Q, method=6)
    imgs[key] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()

html = open(os.path.join(ROOT, "dist-single", "index.html"), encoding="utf-8").read()
css = open(glob.glob(os.path.join(ROOT, "dist-single", "assets", "*.css"))[0], encoding="utf-8").read()
js = open(glob.glob(os.path.join(ROOT, "dist-single", "assets", "*.js"))[0], encoding="utf-8").read()

SHIM = r"""
(function(){
  /* 1) Stockage en mémoire si localStorage/sessionStorage sont bloqués (aperçu sandboxé) */
  function mem(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
  ['localStorage','sessionStorage'].forEach(function(n){
    var ok=true; try{var s=window[n]; s.setItem('__t','1'); s.removeItem('__t')}catch(e){ok=false}
    if(!ok){var m=mem(); try{Object.defineProperty(window,n,{value:m,configurable:true})}catch(e){} try{Object.defineProperty(Window.prototype,n,{value:m,configurable:true})}catch(e){}}
  });
  /* 2) Images intégrées : /img/... -> data URI */
  var M=window.__IMG||{};
  function fix(v){ if(typeof v!=='string'||v.indexOf('img/')<0) return v;
    return v.replace(/(?:\.\/|\/)?img\/[A-Za-z0-9_\-\/\.]+?\.webp/g,function(p){var k=p.replace(/^\.\//,'/'); if(k.charAt(0)!=='/')k='/'+k; return M[k]||p}) }
  var sa=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(n,v){ if(n==='src'||n==='srcset'||n==='href'||n==='poster'||n==='style') v=fix(v); return sa.call(this,n,v) };
  var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{get:d.get,set:function(v){d.set.call(this,fix(v))},configurable:true});
  var sp=CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty=function(a,b,c){return sp.call(this,a,fix(b),c)};
  ['backgroundImage','background'].forEach(function(p){var sd=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,p);
    if(sd&&sd.set) Object.defineProperty(CSSStyleDeclaration.prototype,p,{get:sd.get,set:function(v){sd.set.call(this,fix(v))},configurable:true})});
})();
"""

# retirer les ressources externes / fichiers séparés
html = re.sub(r'<link rel="preconnect"[^>]*>\s*', "", html)
html = re.sub(r'<link href="https://fonts\.googleapis\.com[^>]*>\s*', "", html)
html = re.sub(r'<link rel="preload" as="image"[^>]*>\s*', "", html)
html = re.sub(r'<script type="module" crossorigin src="[^"]+"></script>\s*', "", html)
html = re.sub(r'<link rel="stylesheet" crossorigin href="[^"]+">\s*', "", html)

safe_js = js.replace("</script", "<\\/script")
head_inject = (
    f"<style>{css}</style>\n"
    f"<script>window.__IMG={json.dumps(imgs)};</script>\n"
    f"<script>{SHIM}</script>\n"
)
html = html.replace("</head>", head_inject + "</head>", 1)
html = html.replace("</body>", f'<script type="module">{safe_js}</script>\n</body>', 1)
open(OUT, "w", encoding="utf-8").write(html)
print(f"OK {OUT} — {len(imgs)} images — {os.path.getsize(OUT)/1e6:.1f} Mo")
