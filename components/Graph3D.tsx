
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, ContactShadows, Billboard, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { GraphData, GraphNode, OrbitPath } from '../types';

interface Graph3DProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  selectedNode: GraphNode | null;
  searchQuery?: string;
  isAppOpen?: boolean;
}

const NodeMesh: React.FC<{ 
  node: GraphNode; 
  onClick: () => void;
  isSelected?: boolean;
  isFilteredOut?: boolean;
  isAppOpen?: boolean;
}> = ({ node, onClick, isSelected, isFilteredOut, isAppOpen }) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  
  const isCore = useMemo(() => 
    node.type === 'central' || node.label.toUpperCase().endsWith('.CORE')
  , [node.type, node.label]);

  // Update cursor on hover
  useEffect(() => {
    if (hovered && !isFilteredOut && !isAppOpen) {
      gl.domElement.style.cursor = 'pointer';
    } else {
      gl.domElement.style.cursor = 'auto';
    }
  }, [hovered, isFilteredOut, gl, isAppOpen]);

  useFrame((state) => {
    if (meshRef.current) {
      let targetScale = (hovered || isSelected) ? 1.4 : 1.0;
      
      // If the app is "opened", scale the selected node massively
      if (isSelected && isAppOpen) {
        targetScale = 15.0; // Hero Scale
      } else if (isAppOpen) {
        targetScale = 0.2; // Diminish others
      }

      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

      // Pulse effect for opened app
      if (isSelected && isAppOpen) {
        const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.1 + 1;
        meshRef.current.scale.multiplyScalar(pulse);
      }
    }
  });

  const baseOpacity = isFilteredOut ? 0.15 : (isAppOpen && !isSelected ? 0.05 : 1.0);
  const nodeColor = isSelected || hovered ? '#000000' : (isCore ? '#000000' : '#ffffff');
  const strokeColor = isCore ? '#ffffff' : '#000000';

  return (
    <group position={node.position}>
      <Sphere 
        ref={meshRef}
        args={[node.size || 0.4, 48, 48]} 
        onClick={(e) => { 
          if (isFilteredOut || isAppOpen) return;
          e.stopPropagation(); 
          onClick(); 
        }}
        onPointerOver={() => !isFilteredOut && !isAppOpen && setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={nodeColor} 
          roughness={0.1}
          metalness={(isSelected || isAppOpen) ? 0.9 : 0.2}
          emissive={(isSelected && isAppOpen) ? '#111111' : '#000000'}
          emissiveIntensity={(isSelected && isAppOpen) ? 2.0 : 0}
          transparent
          opacity={baseOpacity}
        />
        <mesh>
          <sphereGeometry args={[(node.size || 0.4) * 1.05, 32, 32]} />
          <meshBasicMaterial 
            color={strokeColor} 
            side={THREE.BackSide} 
            transparent
            opacity={baseOpacity}
          />
        </mesh>
      </Sphere>
      
      {(hovered || (isSelected && !isAppOpen) || (isCore && !isFilteredOut && !isAppOpen)) && (
        <Billboard position={[0, (node.size || 0.4) + 1.5, 0]}>
          <Text
            fontSize={isCore ? 0.8 : 0.45}
            fontWeight="900"
            color="#000000"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.06}
            outlineColor="#ffffff"
            fillOpacity={baseOpacity}
            outlineOpacity={baseOpacity}
          >
            {node.label}
          </Text>
        </Billboard>
      )}

      {isSelected && isAppOpen && (
        <Billboard position={[0, (node.size || 0.4) * 18, 0]}>
           <Text
            fontSize={4}
            fontWeight="900"
            color="#000000"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.2}
          >
            {node.label.toUpperCase()}
          </Text>
          <Text
            fontSize={1}
            position={[0, -3.5, 0]}
            fontWeight="900"
            color="#999999"
            anchorX="center"
            anchorY="middle"
            maxWidth={20}
            textAlign="center"
          >
            APPLICATION_ENVIRONMENT_ACTIVE // THREAD_001
          </Text>
        </Billboard>
      )}
    </group>
  );
};

const OrbitPathVisual: React.FC<{ radius: number; isDimmed?: boolean; isHighlighted?: boolean; isAppOpen?: boolean }> = ({ radius, isDimmed, isHighlighted, isAppOpen }) => {
  const beads = useMemo(() => {
    const count = 36;
    const pts = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  const opacity = isAppOpen ? 0.01 : (isDimmed ? 0.05 : (isHighlighted ? 0.4 : 0.1));
  const beadOpacity = isAppOpen ? 0.01 : (isDimmed ? 0.05 : (isHighlighted ? 0.6 : 0.25));

  return (
    <group>
      <Torus args={[radius, 0.03, 16, 128]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#000000" transparent opacity={opacity} />
      </Torus>
      
      {beads.map((pos, i) => (
        <Sphere key={i} args={[isHighlighted ? 0.09 : 0.06, 8, 8]} position={pos}>
          <meshBasicMaterial color="#000000" transparent opacity={beadOpacity} />
        </Sphere>
      ))}
    </group>
  );
};

const OrbitGroup: React.FC<{ 
  orbit: OrbitPath; 
  onNodeClick: (node: GraphNode) => void;
  parent: GraphNode;
  selectedNode: GraphNode | null;
  searchQuery: string;
  isAppOpen: boolean;
}> = ({ orbit, onNodeClick, parent, selectedNode, searchQuery, isAppOpen }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const isSelectedInThisOrbit = useMemo(() => {
    if (!selectedNode) return false;
    return orbit.nodes.some(n => n.id === selectedNode.id || `${orbit.id}_${n.label}` === selectedNode.id);
  }, [orbit.nodes, orbit.id, selectedNode]);

  useFrame(() => {
    // Rotation stops for all if any node is selected, OR explicitly if an app is "open"
    if (groupRef.current && !selectedNode && !isAppOpen) {
      groupRef.current.rotation.y += 0.0025;
    }
  });

  const matchesSearch = (node: GraphNode) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return node.label.toLowerCase().includes(query) || node.description.toLowerCase().includes(query);
  };

  const isAnyNodeMatching = useMemo(() => orbit.nodes.some(matchesSearch), [orbit.nodes, searchQuery]);

  return (
    <group position={parent.position} rotation={orbit.rotation}>
      <OrbitPathVisual 
        radius={orbit.radius} 
        isDimmed={searchQuery.length > 0 && !isAnyNodeMatching}
        isHighlighted={isSelectedInThisOrbit}
        isAppOpen={isAppOpen}
      />
      <group ref={groupRef}>
        {orbit.nodes.map((node, i) => {
          const angle = (i / orbit.nodes.length) * Math.PI * 2;
          const localPos: [number, number, number] = [
            orbit.radius * Math.cos(angle), 
            0, 
            orbit.radius * Math.sin(angle)
          ];
          
          return (
            <NodeMesh 
              key={node.id} 
              node={{...node, position: localPos}} 
              onClick={() => onNodeClick(node)} 
              isSelected={selectedNode?.id === node.id || selectedNode?.id === `${orbit.id}_${node.label}`}
              isFilteredOut={searchQuery.length > 0 && !matchesSearch(node)}
              isAppOpen={isAppOpen}
            />
          );
        })}
      </group>
    </group>
  );
};

const Scene: React.FC<Graph3DProps> = ({ data, onNodeClick, selectedNode, searchQuery = '', isAppOpen = false }) => {
  const heights = data.centralNodes.map(n => n.position[1]);
  const minY = heights.length > 0 ? Math.min(...heights) : 0;
  const maxY = heights.length > 0 ? Math.max(...heights) : 10;

  const findParent = (id: string) => data.centralNodes.find(n => n.id === id);

  const matchesSearch = (node: GraphNode) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return node.label.toLowerCase().includes(query) || node.description.toLowerCase().includes(query);
  };

  return (
    <>
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', isAppOpen ? 5 : 30, isAppOpen ? 50 : 150]} />
      
      <ambientLight intensity={isAppOpen ? 0.4 : 1.2} />
      <spotLight position={[50, 100, 50]} angle={0.2} penumbra={1} intensity={isAppOpen ? 0.5 : 2} castShadow />
      
      {/* Dynamic Lighting for Focused App */}
      {isAppOpen && selectedNode && (
        <pointLight position={selectedNode.position} intensity={2} color="#ffffff" distance={100} />
      )}

      <mesh position={[0, (minY + maxY) / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, maxY - minY + 80, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={isAppOpen ? 0.01 : 0.08} />
      </mesh>

      <group>
        {data.centralNodes.map((node) => (
          <NodeMesh 
            key={node.id}
            node={node} 
            onClick={() => onNodeClick(node)} 
            isSelected={selectedNode?.id === node.id}
            isFilteredOut={searchQuery.length > 0 && !matchesSearch(node)}
            isAppOpen={isAppOpen}
          />
        ))}
      </group>

      {data.orbits.map((orbit) => {
        const parent = findParent(orbit.parentIds?.[0] || "");
        if (!parent) return null;
        return (
          <OrbitGroup 
            key={orbit.id} 
            orbit={orbit} 
            onNodeClick={onNodeClick} 
            parent={parent} 
            selectedNode={selectedNode}
            searchQuery={searchQuery}
            isAppOpen={isAppOpen}
          />
        );
      })}

      <ContactShadows 
        position={[0, minY - 10, 0]} 
        opacity={isAppOpen ? 0.05 : 0.15} 
        scale={120} 
        blur={2.5} 
        far={40}
        color="#000000" 
      />
      
      <OrbitControls 
        makeDefault 
        enableDamping 
        dampingFactor={0.04} 
        minDistance={isAppOpen ? 5 : 20}
        maxDistance={120}
        enabled={!isAppOpen} // Optional: Lock controls if you want fully cinematic, but keeping them enabled for inspection is usually better
      />
    </>
  );
};

export const Graph3D: React.FC<Graph3DProps> = ({ data, onNodeClick, selectedNode, searchQuery = '', isAppOpen = false }) => {
  return (
    <div className="w-full h-full bg-white relative">
      <Canvas 
        camera={{ position: [60, 45, 60], fov: 30 }} 
        shadows 
        gl={{ antialias: true, alpha: true, stencil: false }}
        dpr={[1, 2]}
      >
        <Scene 
          data={data} 
          onNodeClick={onNodeClick} 
          selectedNode={selectedNode} 
          searchQuery={searchQuery} 
          isAppOpen={isAppOpen}
        />
      </Canvas>
      <div className={`absolute inset-0 pointer-events-none border-[40px] border-white/30 border-double opacity-20 transition-opacity duration-1000 ${isAppOpen ? 'opacity-0' : 'opacity-20'}`} />
    </div>
  );
};
