import React, { useCallback } from 'react';
import ReactFlow, {
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  Position,
  Connection,
} from 'reactflow';
import dagre from '@dagrejs/dagre';

import graph from '../build/graph.json';

import 'reactflow/dist/style.css';

const defaultNodeWidth = 172;
const defaultNodeHeight = 36;

let dagreGraph = new dagre.graphlib.Graph();

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  // We recreate a new graph to recompute completely the node positions.
  // Otherwise, the nodes will remain at the same location.
  dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: node.width ?? defaultNodeWidth, height: node.height ?? defaultNodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - (node.width ?? defaultNodeWidth) / 2,
      y: nodeWithPosition.y - (node.height ?? defaultNodeHeight) / 2,
    };

    const inEdges = dagreGraph.inEdges(node.id) ?? [];
    const isNotADependency = inEdges.length === 0;

    const outEdges = dagreGraph.outEdges(node.id) ?? [];
    const hasNoDependency = outEdges.length === 0;

    const predecessors = (dagreGraph.predecessors(node.id) ?? []) as any as string[]
    const hasParentWithDependencies = predecessors.some((pre) => {
      const inEdges = dagreGraph.inEdges(pre) ?? []
      return inEdges.length > 0;
    })
  
    // if(hasNoDependency) {
    //   node.style = {
    //     ...node.style,
    //     background: "#d9edf8"
    //   }
    // }

    if (!hasParentWithDependencies) {
      node.style = {
        ...node.style,
        background: "#fdffB6"
      }
    }

    if(isNotADependency) {
      node.style = {
        ...node.style,
        background: "#ffd6a5"
      }
    }
    
    node.data.hasNoParentWithDependencies = !hasParentWithDependencies;
    node.data.isNotADependency = isNotADependency;
    node.data.hasNoDependency = hasNoDependency;

    return node;
  });

  return { nodes, edges };
};

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  graph.nodes,
  graph.edges as Edge[] // string-enum conversion breaks the types.
);

export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
      ),
    []
  );
  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges]
  );

  const reset = useCallback(
    () => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        graph.nodes,
        graph.edges as any,
        'TB'
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges]
  );

  const filterPhase1 = useCallback(
    () => {
      const filteredNodes = nodes.filter(node => !node.data.isNotADependency)
      const filteredEdges = edges.filter(edge => 
        filteredNodes.some(node => edge.source === node.id) &&
        filteredNodes.some(node => edge.target === node.id)
      );

      const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
        filteredNodes,
        filteredEdges,
        'TB'
      );

      setNodes([...newNodes]);
      setEdges([...newEdges]);
    },
    [nodes, edges]
  );

  return (
    <div style={{height: '100vh'}}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        onNodeClick={(node) => navigator.clipboard.writeText((node.target as any).dataset.id)}
      >
        <Panel position="top-right">
          <button onClick={() => onLayout('TB')}>vertical layout</button>
          <button onClick={() => onLayout('LR')}>horizontal layout</button>
        </Panel>
        <Panel position='top-left'>
          <button onClick={reset}>Reset</button>
          <button onClick={filterPhase1}>Remove leaf nodes</button>
        </Panel>

        <Panel position='bottom-right'>
          <span>{layoutedNodes.length - nodes.length} / {layoutedNodes.length} atoms refactored</span>
        </Panel>
      </ReactFlow>
    </div>
  );
};