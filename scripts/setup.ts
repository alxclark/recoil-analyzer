import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import ts from "typescript";
import path from "path";
import { Node, type Edge } from "reactflow";
import { collectSelectorDependencies } from "./utilities/selector";
import { annotationsTemplate } from "./utilities/annotations";
import { collectSelectorFamilyDependencies } from "./utilities/selector-family";

export const nodes = new Map<string, Node>();
export const edges = new Map<string, Edge>();

const FILE_MATCHER = "atoms.ts";

function analyzeRecursively(directoryPath: string) {
  const files = readdirSync(directoryPath);

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      analyzeRecursively(filePath);
    } else if (file === FILE_MATCHER) {
      const sourceFile = ts.createSourceFile(
        file,
        readFileSync(filePath).toString(),
        ts.ScriptTarget.ES2015,
        /*setParentNodes */ true
      );

      collectSelectorDependencies(sourceFile);
      // collectSelectorFamilyDependencies(sourceFile);
    }
  });
}

export function run() {
  const directories = process.argv.slice(2);
  directories.forEach((directory) => {
    analyzeRecursively(directory);
  });

  const nodesArray = [...nodes.entries()].map(([, value]) => value);
  const edgesArray = [...edges.entries()].map(([, value]) => value);

  if (!existsSync("./build")) {
    mkdirSync("./build");
  }

  // Only creates a fresh annotation file if it doesn't exist.
  if (!existsSync("./build/annotations.ts")) {
    writeFileSync("./build/annotations.ts", annotationsTemplate);
  }

  writeFileSync(
    "./build/graph.json",
    JSON.stringify({
      nodes: nodesArray,
      edges: edgesArray,
    })
  );
}

run();
