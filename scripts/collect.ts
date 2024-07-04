import { readFileSync, readdirSync, statSync } from "fs";
import ts, {
  findAncestor,
  isCallExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isVariableDeclaration,
} from "typescript";
import path from "path";

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

          const selectorDependency = node.parent.arguments[0].escapedText;

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

          const selector = ancestor.parent.parent.name.escapedText;

          console.log(selector, selectorDependency);
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
