import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Maximize2,
  Minimize2,
  RotateCw,
  Layers,
  Ship,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Vessel3DViewerProps {
  vesselName?: string;
  imo?: string;
  teu?: number;
  loa?: number;
  draught?: number;
  berth?: string;
  status?: string;
  className?: string;
  compact?: boolean;
}

type CameraPreset = 'iso' | 'side' | 'top' | 'bow';

export const Vessel3DViewer: React.FC<Vessel3DViewerProps> = ({
  vesselName = 'Ocean Star',
  imo = '9845214',
  loa = 399,
  draught = 16.2,
  berth = 'Berth B04',
  status = 'Arriving',
  className = '',
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const [cameraView, setCameraView] = useState<CameraPreset>('iso');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References for Three.js state & animation loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const radarRef = useRef<THREE.Mesh | null>(null);
  const propellerRef = useRef<THREE.Group | null>(null);
  const oceanRef = useRef<THREE.Mesh | null>(null);
  const shipGroupRef = useRef<THREE.Group | null>(null);
  const materialsRef = useRef<THREE.Material[]>([]);

  // Smooth camera transition state
  const cameraTransitionRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
  }>({
    active: false,
    startTime: 0,
    duration: 1100,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });

  const isUserInteractingRef = useRef<boolean>(false);

  // Preset camera viewpoints
  const cameraPresets: Record<CameraPreset, { position: THREE.Vector3; target: THREE.Vector3 }> = useMemo(() => ({
    iso: {
      position: new THREE.Vector3(30, 16, 28),
      target: new THREE.Vector3(0, 3.8, 0),
    },
    side: {
      position: new THREE.Vector3(0, 7.5, 36),
      target: new THREE.Vector3(0, 3.8, 0),
    },
    top: {
      position: new THREE.Vector3(0, 44, 2),
      target: new THREE.Vector3(0, 3.5, 0),
    },
    bow: {
      position: new THREE.Vector3(34, 5.5, 9),
      target: new THREE.Vector3(14, 4.5, 0),
    },
  }), []);

  const transitionToCamera = useCallback((view: CameraPreset) => {
    setCameraView(view);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const preset = cameraPresets[view];
    if (!preset) return;

    cameraTransitionRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 1100,
      startPos: camera.position.clone(),
      endPos: preset.position.clone(),
      startTarget: controls.target.clone(),
      endTarget: preset.target.clone(),
    };
  }, [cameraPresets]);

  const handleSetView = (view: CameraPreset) => {
    setIsAutoRotate(false);
    transitionToCamera(view);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // ==========================================
  // THREE.JS SCENE BUILD & LIFECYCLE
  // ==========================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 360;

    // 1. Scene & Exponential Atmospheric Fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      isDark ? 0x071e2c : 0xdff0fc,
      isDark ? 0.007 : 0.005
    );
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.2, 1000);
    camera.position.set(30, 16, 28);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.05 : 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls with Smooth Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 14;
    controls.maxDistance = 120;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Never dip below water level
    controls.minPolarAngle = 0.08;
    controls.target.set(0, 3.8, 0);
    controls.update();
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isUserInteractingRef.current = true;
      cameraTransitionRef.current.active = false;
    });
    controls.addEventListener('end', () => {
      isUserInteractingRef.current = false;
    });

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(
      isDark ? 0x1d3557 : 0xffffff,
      isDark ? 1.5 : 2.2
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      isDark ? 0x7cb5ec : 0xfffaed,
      isDark ? 1.9 : 2.6
    );
    sunLight.position.set(35, 55, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    // Warm deck worklights & navigation illumination
    const navStarboard = new THREE.PointLight(0x10b981, isDark ? 4.0 : 1.5, 30);
    navStarboard.position.set(-6, 8.5, 6.2);
    scene.add(navStarboard);

    const navPort = new THREE.PointLight(0xef4444, isDark ? 4.0 : 1.5, 30);
    navPort.position.set(-6, 8.5, -6.2);
    scene.add(navPort);

    const deckFloodlight = new THREE.PointLight(0x38bdf8, isDark ? 3.0 : 1.0, 35);
    deckFloodlight.position.set(8, 7.5, 0);
    scene.add(deckFloodlight);

    // ==========================================
    // REUSABLE MATERIALS & GEOMETRIES
    // ==========================================
    const sharedGeometries: THREE.BufferGeometry[] = [];
    const sharedMaterials: THREE.Material[] = [];

    const makeMat = (color: number, roughness = 0.45, metalness = 0.25) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        wireframe: isWireframe,
      });
      sharedMaterials.push(mat);
      return mat;
    };

    const redKeelMat = makeMat(0x991b1b, 0.4, 0.2); // Red antifouling hull
    const bootTopMat = makeMat(0xf8fafc, 0.3, 0.1); // White waterline stripe
    const navyHullMat = makeMat(0x0a1926, 0.35, 0.45); // Dark maritime navy topsides
    const deckPlateMat = makeMat(isDark ? 0x1e293b : 0x334155, 0.75, 0.15); // Weathered steel deck
    const whiteSuperstructureMat = makeMat(0xf8fafc, 0.25, 0.1); // Clean white accommodation
    const bridgeGlassMat = makeMat(0x0284c7, 0.1, 0.95); // Reflective blue glass
    const steelGrayMat = makeMat(0x64748b, 0.3, 0.7); // Crane & railing steel
    const brassPropMat = makeMat(0xd97706, 0.3, 0.85); // Bronze propeller
    const safetyOrangeMat = makeMat(0xf97316, 0.3, 0.2); // Lifeboats & funnel

    const containerPalette = [
      0x0ea5a8, // Maersk Teal
      0x168a63, // Evergreen Green
      0xd97706, // Hapag-Lloyd Orange
      0x2563eb, // CMA CGM Blue
      0xf8fafc, // Reefer Pure White
      0x9333ea, // ONE Magenta
      0xdc2626, // Alert Crimson
      0xca8a04, // MSC Gold
    ];

    // ==========================================
    // PROCEDURAL REALISTIC SHIP HULL GENERATOR
    // ==========================================
    const shipGroup = new THREE.Group();
    shipGroupRef.current = shipGroup;

    // Helper to build smoothly lofted hull sections (No blocky/inverted wedges!)
    const buildLoftedSection = (
      sections: { x: number; halfW: number; yBottom: number; yTop: number }[],
      material: THREE.Material
    ) => {
      const geo = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const indices: number[] = [];

      for (let s = 0; s < sections.length; s++) {
        const sec = sections[s];
        // 4 vertices per section: Bottom-Starboard, Top-Starboard, Top-Port, Bottom-Port
        vertices.push(
          sec.x, sec.yBottom, sec.halfW,  // 0: Starboard keel
          sec.x, sec.yTop, sec.halfW,     // 1: Starboard deck/sheer
          sec.x, sec.yTop, -sec.halfW,    // 2: Port deck/sheer
          sec.x, sec.yBottom, -sec.halfW  // 3: Port keel
        );

        if (s > 0) {
          const prev = (s - 1) * 4;
          const curr = s * 4;

          // Starboard Side Quad
          indices.push(prev + 0, curr + 0, curr + 1);
          indices.push(prev + 0, curr + 1, prev + 1);

          // Port Side Quad
          indices.push(prev + 2, curr + 2, curr + 3);
          indices.push(prev + 2, curr + 3, prev + 3);

          // Bottom Keel Quad
          indices.push(prev + 3, curr + 3, curr + 0);
          indices.push(prev + 3, curr + 0, prev + 0);

          // Top Deck Quad
          indices.push(prev + 1, curr + 1, curr + 2);
          indices.push(prev + 1, curr + 2, prev + 2);
        }
      }

      // Close aft cap
      indices.push(0, 1, 2);
      indices.push(0, 2, 3);

      // Close bow cap
      const last = (sections.length - 1) * 4;
      indices.push(last + 0, last + 2, last + 1);
      indices.push(last + 0, last + 3, last + 2);

      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      sharedGeometries.push(geo);
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // 1. Lower Keel Hull Profile (Red Antifouling)
    const lowerKeelSections = [
      { x: -18, halfW: 2.2, yBottom: 0.6, yTop: 2.1 }, // Transom keel
      { x: -14, halfW: 4.8, yBottom: 0.5, yTop: 2.1 },
      { x: -6,  halfW: 5.3, yBottom: 0.5, yTop: 2.1 }, // Midbody
      { x: 4,   halfW: 5.3, yBottom: 0.5, yTop: 2.1 },
      { x: 12,  halfW: 4.9, yBottom: 0.6, yTop: 2.1 },
      { x: 16,  halfW: 3.8, yBottom: 0.8, yTop: 2.1 },
      { x: 19,  halfW: 2.2, yBottom: 1.1, yTop: 2.1 },
      { x: 21.5, halfW: 0.4, yBottom: 1.5, yTop: 2.1 }, // Bow stem base
    ];
    shipGroup.add(buildLoftedSection(lowerKeelSections, redKeelMat));

    // 2. Waterline Boot-Topping Stripe (Crisp White Accent)
    const bootTopSections = lowerKeelSections.map(s => ({
      ...s,
      yBottom: 2.1,
      yTop: 2.3,
    }));
    shipGroup.add(buildLoftedSection(bootTopSections, bootTopMat));

    // 3. Upper Topsides Hull Profile (Dark Navy with Elegant Flared Sheer)
    const upperHullSections = [
      { x: -18, halfW: 3.6, yBottom: 2.3, yTop: 5.0 }, // Transom stern
      { x: -14, halfW: 5.2, yBottom: 2.3, yTop: 5.1 },
      { x: -6,  halfW: 5.4, yBottom: 2.3, yTop: 5.1 }, // Main parallel midbody
      { x: 4,   halfW: 5.4, yBottom: 2.3, yTop: 5.1 },
      { x: 12,  halfW: 5.2, yBottom: 2.3, yTop: 5.2 },
      { x: 16,  halfW: 4.4, yBottom: 2.3, yTop: 5.4 }, // Graceful bow flare
      { x: 19,  halfW: 3.2, yBottom: 2.3, yTop: 5.7 },
      { x: 21.5, halfW: 0.4, yBottom: 2.3, yTop: 6.0 }, // Sharp flared prow stem!
    ];
    shipGroup.add(buildLoftedSection(upperHullSections, navyHullMat));

    // 4. Bulbous Bow (Hydrodynamic Torpedo Bulb under the waterline)
    const bulbousGeo = new THREE.SphereGeometry(1.6, 24, 16);
    bulbousGeo.scale(2.5, 1.1, 0.9);
    sharedGeometries.push(bulbousGeo);
    const bulbousMesh = new THREE.Mesh(bulbousGeo, redKeelMat);
    bulbousMesh.position.set(21.4, 1.4, 0);
    bulbousMesh.castShadow = true;
    shipGroup.add(bulbousMesh);

    // 5. Forecastle Mooring Deck & Anchor Hardware
    const fDeckGeo = new THREE.BoxGeometry(6.0, 0.4, 4.8);
    sharedGeometries.push(fDeckGeo);
    const forecastleDeck = new THREE.Mesh(fDeckGeo, deckPlateMat);
    forecastleDeck.position.set(17.8, 5.5, 0);
    forecastleDeck.receiveShadow = true;
    shipGroup.add(forecastleDeck);

    // Anchor Windlasses & Winches
    [-1.2, 1.2].forEach(wz => {
      const winchGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 12);
      sharedGeometries.push(winchGeo);
      const winch = new THREE.Mesh(winchGeo, steelGrayMat);
      winch.position.set(18.2, 5.8, wz);
      shipGroup.add(winch);

      // Hawse pipe anchor recess
      const anchorGeo = new THREE.BoxGeometry(0.3, 0.8, 0.4);
      sharedGeometries.push(anchorGeo);
      const anchor = new THREE.Mesh(anchorGeo, steelGrayMat);
      anchor.position.set(19.2, 4.4, wz * 1.8);
      anchor.rotation.y = wz > 0 ? 0.3 : -0.3;
      shipGroup.add(anchor);
    });

    // Main Working Deck Plate
    const mainDeckGeo = new THREE.BoxGeometry(32, 0.35, 10.4);
    sharedGeometries.push(mainDeckGeo);
    const mainDeck = new THREE.Mesh(mainDeckGeo, deckPlateMat);
    mainDeck.position.set(-0.5, 5.0, 0);
    mainDeck.receiveShadow = true;
    shipGroup.add(mainDeck);

    // 6. Stern Running Gear: Rudder & Propeller
    const sternGear = new THREE.Group();
    sternGear.position.set(-18.5, 1.2, 0);

    // Rudder Blade
    const rudderGeo = new THREE.BoxGeometry(2.0, 1.8, 0.3);
    sharedGeometries.push(rudderGeo);
    const rudder = new THREE.Mesh(rudderGeo, navyHullMat);
    rudder.position.set(-0.8, 0.2, 0);
    rudder.castShadow = true;
    sternGear.add(rudder);

    // Propeller Hub & 4 Blades
    const propHubGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.9, 12);
    propHubGeo.rotateZ(Math.PI / 2);
    sharedGeometries.push(propHubGeo);
    const propHub = new THREE.Mesh(propHubGeo, brassPropMat);

    const propGroup = new THREE.Group();
    propGroup.position.set(0.6, 0.1, 0);
    propGroup.add(propHub);

    const bladeGeo = new THREE.BoxGeometry(0.12, 1.3, 0.4);
    sharedGeometries.push(bladeGeo);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(bladeGeo, brassPropMat);
      blade.rotation.x = (i * Math.PI) / 2;
      blade.rotation.y = 0.35;
      blade.position.y = Math.sin((i * Math.PI) / 2) * 0.7;
      blade.position.z = Math.cos((i * Math.PI) / 2) * 0.7;
      propGroup.add(blade);
    }
    sternGear.add(propGroup);
    propellerRef.current = propGroup;
    shipGroup.add(sternGear);

    // ==========================================
    // 7. MULTI-TIER BRIDGE SUPERSTRUCTURE
    // ==========================================
    const bridgeIsland = new THREE.Group();
    bridgeIsland.position.set(-11.5, 5.15, 0);

    // Decks 1 to 3 Accommodation Block
    const bLowerGeo = new THREE.BoxGeometry(5.4, 3.4, 8.4);
    sharedGeometries.push(bLowerGeo);
    const bLower = new THREE.Mesh(bLowerGeo, whiteSuperstructureMat);
    bLower.position.y = 1.7;
    bLower.castShadow = true;
    bridgeIsland.add(bLower);

    // Porthole Window Ribbons on accommodation
    [-1.2, 1.2].forEach(py => {
      const pGeo = new THREE.BoxGeometry(5.5, 0.3, 8.5);
      sharedGeometries.push(pGeo);
      const pMesh = new THREE.Mesh(pGeo, steelGrayMat);
      pMesh.position.y = 1.7 + py;
      bridgeIsland.add(pMesh);
    });

    // Deck 4: Navigation Bridge Deck with Extended Bridge Wings
    const bWingsGeo = new THREE.BoxGeometry(4.2, 1.6, 12.8);
    sharedGeometries.push(bWingsGeo);
    const bWings = new THREE.Mesh(bWingsGeo, whiteSuperstructureMat);
    bWings.position.y = 4.2;
    bWings.castShadow = true;
    bridgeIsland.add(bWings);

    // Panoramic Bridge Glass Window Ribbon
    const bGlassGeo = new THREE.BoxGeometry(4.3, 0.8, 12.9);
    sharedGeometries.push(bGlassGeo);
    const bGlass = new THREE.Mesh(bGlassGeo, bridgeGlassMat);
    bGlass.position.y = 4.4;
    bridgeIsland.add(bGlass);

    // Wing Walkway Safety Enclosures
    [-6.3, 6.3].forEach(wz => {
      const wingCabGeo = new THREE.BoxGeometry(1.6, 1.2, 0.4);
      sharedGeometries.push(wingCabGeo);
      const wingCab = new THREE.Mesh(wingCabGeo, whiteSuperstructureMat);
      wingCab.position.set(0.6, 4.3, wz);
      bridgeIsland.add(wingCab);
    });

    // Twin Safety Lifeboats mounted in Davits
    [-4.7, 4.7].forEach(lz => {
      const boatGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.6, 12);
      boatGeo.rotateZ(Math.PI / 2);
      sharedGeometries.push(boatGeo);
      const boat = new THREE.Mesh(boatGeo, safetyOrangeMat);
      boat.position.set(-1.6, 3.6, lz);
      boat.castShadow = true;
      bridgeIsland.add(boat);
    });

    // Exhaust Funnel Stack (Teal with brand badge)
    const funnelGeo = new THREE.CylinderGeometry(1.1, 1.4, 4.2, 16);
    sharedGeometries.push(funnelGeo);
    const funnel = new THREE.Mesh(funnelGeo, makeMat(0x0ea5a8, 0.3, 0.4));
    funnel.position.set(-2.2, 5.8, 0);
    funnel.rotation.z = -0.14;
    funnel.castShadow = true;
    bridgeIsland.add(funnel);

    // Radar Mast & Satellite Communication Domes
    const mastGeo = new THREE.CylinderGeometry(0.14, 0.22, 4.2, 8);
    sharedGeometries.push(mastGeo);
    const mast = new THREE.Mesh(mastGeo, whiteSuperstructureMat);
    mast.position.set(1.0, 6.8, 0);
    bridgeIsland.add(mast);

    const radarGeo = new THREE.BoxGeometry(2.6, 0.24, 0.35);
    sharedGeometries.push(radarGeo);
    const radar = new THREE.Mesh(radarGeo, makeMat(0x0ea5a8, 0.2, 0.8));
    radar.position.set(1.0, 8.8, 0);
    radarRef.current = radar;
    bridgeIsland.add(radar);

    // Dual Satcom Radomes
    [-1.4, 1.4].forEach(dz => {
      const domeGeo = new THREE.SphereGeometry(0.55, 16, 16);
      sharedGeometries.push(domeGeo);
      const dome = new THREE.Mesh(domeGeo, whiteSuperstructureMat);
      dome.position.set(-0.4, 5.6, dz);
      bridgeIsland.add(dome);
    });

    shipGroup.add(bridgeIsland);

    // ==========================================
    // 8. REALISTIC CONTAINER BAYS & CELL GUIDES
    // ==========================================
    const containerGroup = new THREE.Group();
    containerGroup.position.set(0, 5.15, 0);

    const standardBoxGeo = new THREE.BoxGeometry(4.4, 1.95, 2.2);
    sharedGeometries.push(standardBoxGeo);

    // 6 Container Bays forward of the bridge + 1 Aft bay
    const bayConfigs = [
      { x: -6.5, maxTier: 4 },
      { x: -1.8, maxTier: 4 },
      { x: 2.8,  maxTier: 4 },
      { x: 7.4,  maxTier: 3 },
      { x: 11.8, maxTier: 3 },
      { x: 15.6, maxTier: 2 }, // Forward stepped bay for sightlines
    ];

    bayConfigs.forEach((bay, bIdx) => {
      // Cell Guide / Lashing frame tower between bays
      const guideTowerGeo = new THREE.BoxGeometry(0.25, 8.2, 9.6);
      sharedGeometries.push(guideTowerGeo);
      const guideTower = new THREE.Mesh(guideTowerGeo, steelGrayMat);
      guideTower.position.set(bay.x - 2.3, 4.1, 0);
      containerGroup.add(guideTower);

      // 4 Container Rows across the beam
      for (let row = -1.5; row <= 1.5; row += 1) {
        const posZ = row * 2.35;
        for (let tier = 0; tier < bay.maxTier; tier++) {
          const posY = tier * 2.02 + 1.0;
          const colorIdx = (bIdx * 4 + Math.floor(Math.abs(row) * 2) + tier * 3) % containerPalette.length;

          // 1 in 8 containers rendered as refrigerated white reefer
          const isReefer = (bIdx + tier) % 5 === 0;
          const cColor = isReefer ? 0xf8fafc : containerPalette[colorIdx];

          const cMesh = new THREE.Mesh(standardBoxGeo, makeMat(cColor, 0.55, 0.15));
          cMesh.position.set(bay.x, posY, posZ);
          cMesh.castShadow = true;
          cMesh.receiveShadow = true;
          containerGroup.add(cMesh);
        }
      }
    });

    // 1 Aft Container Bay behind the accommodation block
    for (let row = -1; row <= 1; row += 1) {
      const posZ = row * 2.4;
      for (let tier = 0; tier < 2; tier++) {
        const posY = tier * 2.02 + 1.0;
        const cMesh = new THREE.Mesh(standardBoxGeo, makeMat(containerPalette[(row + tier + 2) % containerPalette.length], 0.6, 0.1));
        cMesh.position.set(-16.0, posY, posZ);
        cMesh.castShadow = true;
        cMesh.receiveShadow = true;
        containerGroup.add(cMesh);
      }
    }

    shipGroup.add(containerGroup);

    // ==========================================
    // 9. DOCKSIDE STS CRANE & BERTH CONTEXT
    // ==========================================
    const berthEnvironment = new THREE.Group();
    berthEnvironment.position.set(2.0, 0, -18.0);

    // Concrete Quay Wharf Wall in background
    const quayWharfGeo = new THREE.BoxGeometry(70, 4.2, 14);
    sharedGeometries.push(quayWharfGeo);
    const quayWharf = new THREE.Mesh(quayWharfGeo, makeMat(isDark ? 0x1e293b : 0x64748b, 0.85, 0.1));
    quayWharf.position.set(0, 2.1, -7);
    quayWharf.receiveShadow = true;
    berthEnvironment.add(quayWharf);

    // STS Gantry Crane
    const craneGroup = new THREE.Group();
    craneGroup.position.set(4.0, 4.2, -4.5);

    const craneOrangeMat = makeMat(0xf97316, 0.35, 0.35);

    // 4 Lattice Legs
    const cLegGeo = new THREE.BoxGeometry(0.9, 18, 0.9);
    sharedGeometries.push(cLegGeo);
    [-3.2, 3.2].forEach(lx => {
      [-2.4, 2.4].forEach(lz => {
        const leg = new THREE.Mesh(cLegGeo, craneOrangeMat);
        leg.position.set(lx, 9, lz);
        leg.castShadow = true;
        craneGroup.add(leg);
      });
    });

    // Overhead Boom Beam extending over ship
    const boomGeo = new THREE.BoxGeometry(2.0, 2.0, 32);
    sharedGeometries.push(boomGeo);
    const boom = new THREE.Mesh(boomGeo, craneOrangeMat);
    boom.position.set(0, 19, 10);
    boom.castShadow = true;
    craneGroup.add(boom);

    // Trolley & Suspended Spreader
    const trolleyGeo = new THREE.BoxGeometry(2.8, 1.2, 2.6);
    sharedGeometries.push(trolleyGeo);
    const trolley = new THREE.Mesh(trolleyGeo, whiteSuperstructureMat);
    trolley.position.set(0, 17.6, 15);
    craneGroup.add(trolley);

    berthEnvironment.add(craneGroup);
    shipGroup.add(berthEnvironment);

    // ==========================================
    // 10. EXPANSIVE REALISTIC OCEAN WATERWAY
    // ==========================================
    // Generous ocean size (220x220) with fine subdivision for undulating surface swell
    const oceanGeo = new THREE.PlaneGeometry(240, 240, 56, 56);
    sharedGeometries.push(oceanGeo);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x051d2c : 0x0284c7,
      roughness: 0.15,
      metalness: 0.88,
      transparent: true,
      opacity: 0.92,
    });
    sharedMaterials.push(oceanMat);

    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, 2.0, 10); // Water level at Y = 2.0
    ocean.receiveShadow = true;
    oceanRef.current = ocean;
    scene.add(ocean);

    scene.add(shipGroup);
    materialsRef.current = sharedMaterials;

    // ==========================================
    // 11. ANIMATION & RENDER LOOP
    // ==========================================
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Camera Transition Interpolation (Cubic easeInOut)
      if (cameraTransitionRef.current.active) {
        const elapsed = performance.now() - cameraTransitionRef.current.startTime;
        const p = Math.min(1, elapsed / cameraTransitionRef.current.duration);
        const t = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        camera.position.lerpVectors(
          cameraTransitionRef.current.startPos,
          cameraTransitionRef.current.endPos,
          t
        );
        controls.target.lerpVectors(
          cameraTransitionRef.current.startTarget,
          cameraTransitionRef.current.endTarget,
          t
        );

        if (p >= 1) {
          cameraTransitionRef.current.active = false;
        }
      }

      // Auto-Orbit and Ship Buoyancy Physics
      if (shipGroupRef.current) {
        // Natural maritime roll & pitch heave
        shipGroupRef.current.position.y = Math.sin(time * 1.4) * 0.15;
        shipGroupRef.current.rotation.z = Math.sin(time * 1.1) * 0.012; // Roll
        shipGroupRef.current.rotation.x = Math.cos(time * 0.9) * 0.008; // Pitch
      }

      if (isAutoRotate && !isUserInteractingRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.65;
      } else {
        controls.autoRotate = false;
      }

      controls.update();

      // Rotate Radar Scanner
      if (radarRef.current) {
        radarRef.current.rotation.y = time * 3.8;
      }

      // Spin Propeller slowly
      if (propellerRef.current) {
        propellerRef.current.rotation.x = time * 4.5;
      }

      // Dynamic Ocean Wave Surface Undulation
      if (oceanRef.current) {
        const pos = (oceanRef.current.geometry as THREE.PlaneGeometry).attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          const wave = Math.sin(u * 0.12 + time * 1.6) * 0.22 + Math.cos(v * 0.14 + time * 1.2) * 0.18;
          pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 12. Resize Observer (No stretching or aspect glitches)
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 13. Clean Cleanup & Memory Leak Disposal
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.dispose();

      sharedGeometries.forEach(g => g.dispose());
      sharedMaterials.forEach(m => m.dispose());

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDark, isWireframe]);

  // Update Wireframe state smoothly
  useEffect(() => {
    materialsRef.current.forEach(mat => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.wireframe = isWireframe;
      }
    });
  }, [isWireframe]);

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-border-subtle bg-surface shadow-elevated transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-canvas flex flex-col' : className
      }`}
    >
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className={`w-full relative cursor-grab active:cursor-grabbing select-none ${
          isFullscreen ? 'flex-1 h-full' : compact ? 'h-64' : 'h-[380px] lg:h-[440px]'
        }`}
      />

      {/* Top HUD Overlay Banner */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Vessel Badge & Telemetry */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl glass-card text-xs shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-teal to-cyan-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Ship className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-text-main flex items-center gap-1.5">
              <span>{vesselName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal border border-brand-teal/20 font-semibold">
                IMO {imo}
              </span>
            </div>
            <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5 font-medium">
              <span>LOA: {loa}m</span>
              <span>•</span>
              <span>Draft: {draught}m</span>
              <span>•</span>
              <span className="text-emerald-500 font-semibold">{status}</span>
            </div>
          </div>
        </div>

        {/* Live Quayside Radar Indicator */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl glass-card text-xs shadow-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
          <span className="text-text-main">{berth}</span>
          <span className="text-[10px] text-text-muted font-normal">Digital Twin 3D</span>
        </div>
      </div>

      {/* Bottom Controls Toolbar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Preset Angle Selectors */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-2xl glass-card shadow-sm">
          {(['iso', 'side', 'top', 'bow'] as const).map(view => (
            <button
              key={view}
              onClick={() => handleSetView(view)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
                cameraView === view
                  ? 'bg-brand-teal text-white shadow-xs'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-subtle'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Interactive Utility Toggles */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl glass-card shadow-sm">
          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setIsAutoRotate(prev => !prev)}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isAutoRotate ? 'bg-brand-teal text-white shadow-xs' : 'text-text-muted hover:text-text-main hover:bg-surface-subtle'
            }`}
            title={isAutoRotate ? 'Pause Rotation' : 'Enable 360° Auto-Rotate'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
          </button>

          {/* Wireframe / Solid Mode */}
          <button
            onClick={() => setIsWireframe(prev => !prev)}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isWireframe ? 'bg-brand-teal text-white shadow-xs' : 'text-text-muted hover:text-text-main hover:bg-surface-subtle'
            }`}
            title={isWireframe ? 'Solid Render' : 'Wireframe Digital Mesh'}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Expand */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-2 rounded-xl text-xs text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D Inspection'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Vessel3DViewer;
