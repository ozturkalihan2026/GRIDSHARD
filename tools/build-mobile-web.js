"use strict";

// Capacitor paketi web yayınıyla aynı derleme hattını kullanır; farkı zorunlu
// HTTPS API adresi ve manifestteki "mobile" platformudur.
const { buildClient } = require("./build-client.js");

buildClient({ mobile: true }).then(({ destination, manifest }) => {
  const omitted = manifest.audio.omitted_wav.length;
  console.log(`Mobil web paketi hazır: ${destination} (${manifest.build_id})`);
  if (omitted) console.log(`Ses türevi kullanılan ${omitted} WAV pakete alınmadı.`);
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
