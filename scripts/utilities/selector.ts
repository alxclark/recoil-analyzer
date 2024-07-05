import ts, {
  isIdentifier,
  isCallExpression,
  findAncestor,
  isObjectLiteralExpression,
  isVariableDeclaration,
} from "typescript";
import { edges, nodes } from "../setup";
import { MarkerType } from "reactflow";

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
                type: "selector",
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

          // In some cases, the selector reads itself
          if (!edges.has(id) && selector !== selectorDependency) {
            edges.set(id, {
              id,
              source: selector,
              target: selectorDependency,
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            });
          }
        }
        break;
      }
    }

    ts.forEachChild(node, collect);
  }
}
