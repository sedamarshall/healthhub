"""Download all product images from the old site into public/img/p.
Resumable: skips files already on disk. Writes data/image_manifest.json (url -> /img/p/<file>)."""
import json, hashlib, os, sys, urllib.request, urllib.parse, concurrent.futures as cf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "img", "p")
urls = [u.strip() for u in open(os.path.join(ROOT, "data", "healthhub_image_urls.txt"), encoding="utf-8") if u.strip()]
def name(u):
    ext = os.path.splitext(urllib.parse.urlparse(u).path)[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"): ext = ".jpg"
    return hashlib.sha1(u.encode()).hexdigest()[:16] + ext
def fetch(u):
    f = os.path.join(OUT, name(u))
    if os.path.exists(f) and os.path.getsize(f) > 0: return u, "/img/p/" + name(u), None
    try:
        safe = urllib.parse.quote(u, safe=":/?&=%()'")
        req = urllib.request.Request(safe, headers={"User-Agent": "Mozilla/5.0 (catalog-migration)"})
        with urllib.request.urlopen(req, timeout=30) as r: data = r.read()
        with open(f, "wb") as fh: fh.write(data)
        return u, "/img/p/" + name(u), None
    except Exception as e:
        return u, None, str(e)
manifest, failed = {}, {}
with cf.ThreadPoolExecutor(8) as ex:
    for i, (u, local, err) in enumerate(ex.map(fetch, urls), 1):
        if local: manifest[u] = local
        else: failed[u] = err
        if i % 250 == 0: print(f"{i}/{len(urls)} ok={len(manifest)} failed={len(failed)}", flush=True)
json.dump(manifest, open(os.path.join(ROOT, "data", "image_manifest.json"), "w"), indent=0)
json.dump(failed, open(os.path.join(ROOT, "data", "image_failures.json"), "w"), indent=1)
print(f"DONE ok={len(manifest)} failed={len(failed)}")
