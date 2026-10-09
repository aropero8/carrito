// Reconocimiento de voz. En Android usa el plugin nativo propio «Voice»
// (android/app/src/main/java/com/alberto/carrito/VoicePlugin.java; el WebView no trae la Web Speech API).
// En el navegador (npm run dev) usa la Web Speech API si existe (Chrome, Edge).
// Si no hay ninguno, voiceAvailable() da false y no se muestra el micrófono.
import { Capacitor, registerPlugin } from '@capacitor/core';

const LANG = 'es-ES';
const native = Capacitor.isNativePlatform();
const Voice = registerPlugin('Voice');
const WebRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

const MESSAGES = {
  permission: 'Sin permiso de micrófono. Puedes darlo en Ajustes',
  nomatch: 'No te he entendido. Prueba otra vez',
  network: 'Sin conexión para reconocer la voz',
  failed: 'No se ha podido usar el micrófono',
};
// Errores de la Web Speech API → códigos del plugin nativo
const WEB_ERRORS = { 'no-speech': 'nomatch', aborted: 'nomatch', network: 'network', 'not-allowed': 'permission',
  'service-not-allowed': 'permission' };

// El mensaje del error ya es el texto que se enseña al usuario
const fail = (code) => Object.assign(new Error(MESSAGES[code] ?? MESSAGES.failed), { voice: true });

let availability;
export function voiceAvailable() {
  availability ??= native
    ? Voice.available().then((r) => r.available, () => false)
    : Promise.resolve(!!WebRecognition);
  return availability;
}

// Escucha una frase y devuelve las alternativas reconocidas, la más probable primero.
// Si falla, el error trae en `message` el aviso para el usuario.
export async function listen() {
  let matches;
  try {
    matches = native ? (await Voice.listen({ language: LANG })).matches : await listenWeb();
  } catch (e) {
    throw e.voice ? e : fail(e.code);
  }
  if (!matches?.length) throw fail('nomatch');
  return matches;
}

let webRec = null;

function listenWeb() {
  return new Promise((resolve, reject) => {
    const rec = new WebRecognition();
    rec.lang = LANG;
    rec.maxAlternatives = 5;
    let matches = [];
    rec.onresult = (e) => (matches = Array.from(e.results[0], (alt) => alt.transcript));
    rec.onerror = (e) => reject(fail(WEB_ERRORS[e.error]));
    rec.onend = () => {
      webRec = null;
      resolve(matches);
    };
    webRec = rec;
    rec.start();
  });
}

// Deja de escuchar ya; lo que se haya dicho hasta ahora se reconoce igualmente
export function stopListening() {
  if (native) Voice.stop().catch(() => {});
  else webRec?.stop();
}
