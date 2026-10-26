import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { rt } from '../state/runtime';

/** Paper-white apparatus, fine ink silhouettes and restrained colour accents. */
export function InkScene() {
  const { gl, scene, camera } = useThree();
  const effect = useMemo(() => new OutlineEffect(gl, {
    defaultThickness: 0.0015,
    defaultColor: [0.09, 0.095, 0.087],
    defaultAlpha: 0.85,
  }), [gl]);
  const visited = useRef(new WeakSet<THREE.Material>());
  const edged = useRef(new WeakSet<THREE.Mesh>());
  const edges = useRef<THREE.LineSegments[]>([]);
  const currentExperiment = useRef('');
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#292f28', transparent: true, opacity: 0.72, depthWrite: false }), []);
  const clearEdges = () => {
    for (const line of edges.current) { line.removeFromParent(); line.geometry.dispose(); }
    edges.current = [];
    edged.current = new WeakSet();
  };
  useEffect(() => () => { clearEdges(); lineMaterial.dispose(); }, [lineMaterial]);

  useFrame(() => {
    if (currentExperiment.current !== rt.exp?.id) { clearEdges(); currentExperiment.current = rt.exp?.id ?? ''; }
    const apparatus = scene.getObjectByName('experiment-rig');
    // New material instances can appear when a parameter swaps an apparatus.
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      let belongs = false;
      for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
        if (parent === apparatus) { belongs = true; break; }
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (belongs && !edged.current.has(object) && !(object instanceof THREE.InstancedMesh) && materials.some(m => m instanceof THREE.MeshStandardMaterial)) {
        edged.current.add(object);
        const line = new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, materials.some(m => m.transparent) ? 12 : 30), lineMaterial);
        line.renderOrder = 1;
        object.add(line);
        edges.current.push(line);
      }
      for (const material of materials) {
        const lit = material instanceof THREE.MeshStandardMaterial;
        const ink = belongs && lit;
        const showHull = ink && !material.transparent;
        if (material.userData.outlineParameters?.visible !== showHull) {
          material.userData.outlineParameters = { visible: showHull, thickness: 0.0015, alpha: 0.85 };
        }
        if (visited.current.has(material)) continue;
        visited.current.add(material);
        if (!ink || (material.onBeforeCompile as THREE.Material['onBeforeCompile'] & { paperInk?: boolean }).paperInk) continue;
        material.roughness = 0.96;
        material.metalness = 0;
        const original = material.onBeforeCompile;
        const paperCompile: THREE.Material['onBeforeCompile'] = (shader, renderer) => {
          original.call(material, shader, renderer);
          if (shader.fragmentShader.includes('float inkLight')) return;
          shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
            #include <dithering_fragment>
            float inkLight = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 paperShade = vec3(0.95, 0.944, 0.918) * (0.62 + 0.38 * inkLight);
            gl_FragColor.rgb = mix(paperShade, gl_FragColor.rgb, ${material.transparent ? '0.72' : '0.25'});
            float pencil = smoothstep(0.88, 1.0, sin((gl_FragCoord.x + gl_FragCoord.y * 0.73) * 1.45));
            gl_FragColor.rgb *= 1.0 - pencil * clamp(0.8 - inkLight, 0.0, 0.5) * 0.28;
          `);
        };
        Object.assign(paperCompile, { paperInk: true });
        material.onBeforeCompile = paperCompile;
        material.customProgramCacheKey = () => 'apparatus-paper-ink-v2';
        material.needsUpdate = true;
      }
    });
    effect.render(scene, camera);
  }, 1);
  return null;
}
