import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import ts, {
  findAncestor,
  isCallExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isVariableDeclaration,
} from "typescript";
import path from "path";
import { Node, type Edge } from "reactflow";

const nodes = new Map<string, Node>();
const edges = new Map<string, Edge>();

export function collectSelectorDependencies(sourceFile: ts.SourceFile) {
  collect(sourceFile);

  function collect(node: ts.Node) {
    switch (true) {
      case isIdentifier(node): {
        if (node.escapedText === "get") {
          // We retrieved all calls to `get(/* */)`, but we need to validate that it comes from Recoil.

          if (!isCallExpression(node.parent)) return;

          if (
            !node.parent.arguments[0] ||
            !isIdentifier(node.parent.arguments[0])
          )
            return;

          const selectorDependency =
            node.parent.arguments[0].escapedText.toString();

          // Attempt to find an ancestor that is called `selector`.
          const ancestor = findAncestor(
            node,
            (expression) =>
              isObjectLiteralExpression(expression) &&
              isCallExpression(expression.parent) &&
              isIdentifier(expression.parent.expression) &&
              expression.parent.expression.escapedText === "selector"
          );

          if (!ancestor || !isCallExpression(ancestor.parent)) return;
          if (!isVariableDeclaration(ancestor.parent.parent)) return;
          if (!isIdentifier(ancestor.parent.parent.name)) return;

          const selector = ancestor.parent.parent.name.escapedText.toString();

          if (!nodes.has(selector)) {
            // Can store additional metadata (ie if selector, atom or atomFamily)
            nodes.set(selector, {
              id: selector,
              data: {
                label: selector,
              },
              position: { x: 0, y: 0 },
            });
          }

          if (!nodes.has(selectorDependency)) {
            nodes.set(selectorDependency, {
              id: selectorDependency,
              data: {
                label: selectorDependency,
              },
              position: { x: 0, y: 0 },
            });
          }

          const id = `${selector}-->${selectorDependency};`;

          if (!edges.has(id)) {
            edges.set(id, {
              id,
              source: selector,
              target: selectorDependency,
            });
          }
        }
        break;
      }
    }

    ts.forEachChild(node, collect);
  }
}

function readFilesRecursively(directoryPath: string) {
  const files = readdirSync(directoryPath);

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      readFilesRecursively(filePath);
    } else if (file === "atoms.ts") {
      const sourceFile = ts.createSourceFile(
        file,
        readFileSync(filePath).toString(),
        ts.ScriptTarget.ES2015,
        /*setParentNodes */ true
      );

      collectSelectorDependencies(sourceFile);
    }
  });
}

const directories = process.argv.slice(2);
directories.forEach((directory) => {
  readFilesRecursively(directory);
});

const nodesArray = [...nodes.entries()].map(([, value]) => value);
const edgesArray = [...edges.entries()].map(([, value]) => value);

if (!existsSync("./build")) {
  mkdirSync("./build");
}

if (!existsSync("./build/annotations.ts")) {
  writeFileSync(
    "./build/annotations.ts",
    `
import { StateAnnotation } from "../source/types";

export const stateAnnotations = new Map<string, StateAnnotation>([]);
`
  );
}

writeFileSync(
  "./build/graph.json",
  JSON.stringify({
    nodes: nodesArray,
    edges: edgesArray,
  })
);
