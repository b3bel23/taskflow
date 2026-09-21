// Id de tarefa (UUID v4). `crypto.randomUUID()` só existe em CONTEXTO SEGURO
// (https ou localhost): abrir o app por `http://192.168.x.x` — por exemplo,
// para testar no celular via `vite --host` — o deixa `undefined`, e criar uma
// tarefa lançaria uma exceção, quebrando o contrato do AD-4 (as ações nunca
// lançam). Sem `randomUUID`, cai em `getRandomValues` (disponível também fora
// de contexto seguro) e, em último caso, em `Math.random` — o id só precisa
// ser único dentro do `localStorage` de uma pessoa, não imprevisível.
export function newTaskId(): string {
  const webCrypto = globalThis.crypto as Crypto | undefined;
  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
