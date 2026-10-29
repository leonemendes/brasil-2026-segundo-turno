const buf = new Uint8Array(await Bun.file(process.argv[2]).arrayBuffer());
function walk(b: Uint8Array, off: number, end: number, depth: number) {
  while (off < end) {
    const tag = b[off]; let p = off + 1; let len = b[p++];
    if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = len * 256 + b[p++]; }
    const constructed = (tag & 0x20) !== 0; const body = b.subarray(p, p + len);
    let show = "";
    if (!constructed) {
      const txt = new TextDecoder("latin1").decode(body);
      show = /^[\x20-\x7e]*$/.test(txt) && len > 0 ? JSON.stringify(txt) : (len <= 8 ? "int " + body.reduce((a, x) => a * 256 + x, 0) : `[${len} bytes]`);
    }
    console.log(`${"  ".repeat(depth)}${tag.toString(16)} len=${len} ${show}`);
    if (constructed) walk(b, p, p + len, depth + 1);
    else if (tag === 0x04 && len > 20 && depth < 3) { try { walk(b, p, p + len, depth + 1); } catch {} }
    off = p + len;
  }
}
walk(buf, 0, buf.length, 0);
