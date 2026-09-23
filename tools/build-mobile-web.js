"use strict";

const { buildClient } = require("./build-client.js");

buildClient({ mobile: true }).then(({ destination, manifest }) => {
  console.log(`Mobil web paketi hazır: ${destination} (${manifest.build_id})`);
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
