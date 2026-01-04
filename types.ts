
export interface GraphNode {
  id: string;
  label: string;
  description: string;
  position: [number, number, number];
  size: number;
  type: 'central' | 'orbit';
}

export interface OrbitPath {
  id: string;
  radius: number;
  rotation: [number, number, number];
  nodes: GraphNode[];
  parentIds?: string[]; // Multiple parents for shared orbits
  color?: string; // Specific color for this orbit branch
}

export interface GraphData {
  centralNodes: GraphNode[];
  orbits: OrbitPath[];
  title: string;
  analysis: string;
  eonCode?: string; // Raw EON source code
}
