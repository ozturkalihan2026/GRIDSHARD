"use strict";

const fs = require("node:fs");
const path = require("node:path");

function androidDisplayActivity(source) {
  const imports = [...source.matchAll(/import (?:com\.getcapacitor\.BridgeActivity|com\.gridshard\.nativeui\.GridshardActivity);/g)];
  const classes = [...source.matchAll(/public class MainActivity extends (?:BridgeActivity|GridshardActivity)\b/g)];
  if (imports.length !== 1 || classes.length !== 1) {
    throw new Error("MainActivity için beklenen tek Capacitor etkinliği bulunmalı.");
  }
  return source.replace(imports[0][0], "import com.gridshard.nativeui.GridshardActivity;")
    .replace(classes[0][0], "public class MainActivity extends GridshardActivity");
}

function configureNativeDisplay(nativeRoot, repositoryRoot) {
  const javaRoot = path.join(nativeRoot, "app/src/main/java");
  const activities = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      if (entry.isSymbolicLink()) throw new Error("Native Java kaynağı symlink olamaz.");
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.name === "MainActivity.java") activities.push(filename);
    }
  }
  visit(javaRoot);
  if (activities.length !== 1) throw new Error("Native projede tek MainActivity.java bulunmalı.");
  const before = fs.readFileSync(activities[0], "utf8");
  const after = androidDisplayActivity(before);
  const template = fs.readFileSync(path.join(repositoryRoot, "tools/native-templates/GridshardActivity.java"));
  const target = path.join(javaRoot, "com/gridshard/nativeui/GridshardActivity.java");
  fs.mkdirSync(path.dirname(target), {recursive:true});
  if (!fs.existsSync(target) || !fs.readFileSync(target).equals(template)) fs.writeFileSync(target, template);
  if (before !== after) fs.writeFileSync(activities[0], after, "utf8");
}

module.exports = {androidDisplayActivity, configureNativeDisplay};
