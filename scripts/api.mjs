// Reads the API from a definitions.ts (the plugin interface's methods) and names the Tauri command for each.
// Used by the parity tests (__tests__/apiParity.test.ts) and to write the lists by hand once.
import { readFileSync } from 'node:fs';

/** The methods of `export interface <name> {` in a definitions.ts or .d.ts, in order (at the members' indentation) */
export function interfaceMethods(source, name) {
  const start = source.indexOf(`export interface ${name} {`);
  if (start < 0) throw new Error(`interface ${name} not found`);
  const body = source.slice(start, source.indexOf('\n}', start));
  const members = [...body.matchAll(/^( +)([a-zA-Z]+)\??\(/gm)];
  const indent = Math.min(...members.map((m) => m[1].length));
  return members.filter((m) => m[1].length === indent).map((m) => m[2]);
}

/** snake_case the way heck (Rust, used by Tauri) does it: getAppUserID → get_app_user_id, setFBAnonymousID → set_fb_anonymous_id */
export function snake(name) {
  let out = '';
  for (let i = 0; i < name.length; i++) {
    const c = name[i];
    const prev = name[i - 1];
    const next = name[i + 1];
    const upper = c >= 'A' && c <= 'Z';
    if (i > 0 && upper) {
      const prevLower = prev >= 'a' && prev <= 'z';
      const prevUpper = prev >= 'A' && prev <= 'Z';
      const nextLower = next !== undefined && next >= 'a' && next <= 'z';
      if (prevLower || (prevUpper && nextLower)) out += '_';
    }
    out += c.toLowerCase();
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, iface] = process.argv.slice(2);
  for (const m of interfaceMethods(readFileSync(file, 'utf8'), iface)) console.log(`${snake(m)} ${m}`);
}
