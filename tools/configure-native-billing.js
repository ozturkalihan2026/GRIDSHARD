"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const SUPPORTED_VERSION = "8.8.1";
const MARKER = "// GRIDSHARD safe Billing diagnostics (managed v1)";
const ORIGINAL = 'Log.d(TAG, "onProductDetailsResponse() called for query");\n'
  + '                        Log.d(TAG, "Query result: " + billingResult.getResponseCode() + " - " + billingResult.getDebugMessage());';
const MANAGED = 'Log.d(TAG, "onProductDetailsResponse() called for query");\n'
  + `                        ${MARKER}\n`
  + '                        GridshardBillingDiagnostics.report(billingResult, queryProductDetailsResult);\n'
  + '                        Log.d(TAG, "Query result: " + billingResult.getResponseCode());';
const FLOW_MARKER = "// GRIDSHARD main-thread Billing flow (managed v1)";
const FLOW_ORIGINAL = `// Launch the billing flow
                        Log.d(TAG, "Launching billing flow");
                        BillingResult billingResult2 = billingClient.launchBillingFlow(getActivity(), billingFlowParams);
                        Log.d(
                            TAG,
                            "Billing flow launch result: " + billingResult2.getResponseCode() + " - " + billingResult2.getDebugMessage()
                        );
                        Log.i(NativePurchasesPlugin.TAG, "onProductDetailsResponse2" + billingResult2);`;
const FLOW_MANAGED = `${FLOW_MARKER}
                        final android.app.Activity billingActivity = getActivity();
                        billingActivity.runOnUiThread(() -> {
                            // Launch the billing flow
                            Log.d(TAG, "Launching billing flow");
                            BillingResult billingResult2 = billingClient.launchBillingFlow(billingActivity, billingFlowParams);
                            Log.d(
                                TAG,
                                "Billing flow launch result: " + billingResult2.getResponseCode() + " - " + billingResult2.getDebugMessage()
                            );
                            Log.i(NativePurchasesPlugin.TAG, "onProductDetailsResponse2" + billingResult2);
                        });`;

function billingDiagnosticsSource(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  const occurrences = value => normalized.split(value).length - 1;
  if (occurrences(MARKER)) {
    if (occurrences(MARKER) !== 1 || occurrences(MANAGED) !== 1 || occurrences(ORIGINAL)) {
      throw new Error("Unexpected managed Billing diagnostics; refusing a partial or duplicate patch.");
    }
    return normalized;
  }
  if (occurrences(ORIGINAL) !== 1) throw new Error("Unsupported native product-query template; review before patching.");
  return normalized.replace(ORIGINAL, MANAGED);
}

function billingMainThreadSource(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  const occurrences = value => normalized.split(value).length - 1;
  if (occurrences("billingClient.launchBillingFlow(") !== 1) {
    throw new Error("Unexpected Billing launch count; review before patching.");
  }
  if (occurrences(FLOW_MARKER)) {
    if (occurrences(FLOW_MARKER) !== 1 || occurrences(FLOW_MANAGED) !== 1 || occurrences(FLOW_ORIGINAL)) {
      throw new Error("Unexpected managed Billing main-thread flow; refusing a partial or duplicate patch.");
    }
    return normalized;
  }
  if (occurrences(FLOW_ORIGINAL) !== 1) throw new Error("Unsupported native Billing launch template; review before patching.");
  // Only dispatch changes. The same Activity and already-built parameters
  // reach Billing; product/offer/account IDs, grant/consume and policy stay put.
  return normalized.replace(FLOW_ORIGINAL, FLOW_MANAGED);
}

function atomicGeneratedWrite(filename, source) {
  if (fs.existsSync(filename) && fs.readFileSync(filename, "utf8") === source) return;
  // pnpm files may be hard-linked to its store. Replace the workspace entry
  // atomically instead of modifying the shared dependency-store inode.
  const temporary = `${filename}.gridshard-${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, source, {encoding:"utf8", flag:"wx"});
  try { fs.renameSync(temporary, filename); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function configureNativeBilling(repositoryRoot) {
  const dependency = path.join(repositoryRoot, "node_modules/@capgo/native-purchases");
  const relative = path.relative(fs.realpathSync(repositoryRoot), fs.realpathSync(dependency));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Native Billing generated sources must stay inside this workspace.");
  }
  const version = JSON.parse(fs.readFileSync(path.join(dependency, "package.json"), "utf8")).version;
  if (version !== SUPPORTED_VERSION) throw new Error("Native Billing diagnostic patch requires reviewed native-purchases 8.8.1.");
  const gradle = fs.readFileSync(path.join(dependency, "android/build.gradle"), "utf8");
  if (!/def billing_version = "9\.1\.0"/.test(gradle)) throw new Error("Unreviewed Billing Library version.");
  const javaRoot = path.join(dependency, "android/src/main/java/ee/forgr/nativepurchases");
  const pluginFile = path.join(javaRoot, "NativePurchasesPlugin.java");
  // Validate both exact templates before any generated dependency is written.
  const patched = billingMainThreadSource(billingDiagnosticsSource(fs.readFileSync(pluginFile, "utf8")));
  const helper = fs.readFileSync(path.join(repositoryRoot, "tools/native-templates/GridshardBillingDiagnostics.java"), "utf8");
  atomicGeneratedWrite(path.join(javaRoot, "GridshardBillingDiagnostics.java"), helper);
  atomicGeneratedWrite(pluginFile, patched);
}

if (require.main === module) configureNativeBilling(path.resolve(__dirname, ".."));
module.exports = {SUPPORTED_VERSION, MARKER, ORIGINAL, MANAGED, FLOW_MARKER, FLOW_ORIGINAL, FLOW_MANAGED,
  billingDiagnosticsSource, billingMainThreadSource, configureNativeBilling};
