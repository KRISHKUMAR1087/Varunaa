import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Anchor,
  Ship,
  Cpu,
  Layers,
  Building,
  X,
  Compass,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useOperations } from '../../context/OperationsContext';
import { useAuth } from '../../context/AuthContext';

interface Port3DOverviewProps {
  className?: string;
  heightClass?: string;
}

type ViewPresetId = 'aerial' | 'ship' | 'cranes' | 'yard' | 'entrance';

interface SelectedEntity {
  type: 'vessel' | 'berth' | 'crane' | 'yard' | 'tower';
  id: string;
  title: string;
  subtitle: string;
  statusBadge: {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
  };
  metrics: { label: string; value: string | number }[];
  note?: string;
}

export const Port3DOverview: React.FC<Port3DOverviewProps> = ({
  className = '',
  heightClass = 'h-[440px] sm:h-[500px] lg:h-[560px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const { isDemoUser } = useAuth();
  const {
    vessels,
    berths,
    cranes,
    yardBlocks,
    forecast,
    isOptimizationApplied,
  } = useOperations();

  const [activeView, setActiveView] = useState<ViewPresetId>('aerial');
  const [isTouring, setIsTouring] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  // References for Three.js state & animation loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const interactiveMeshesRef = useRef<THREE.Object3D[]>([]);
  const oceanMeshRef = useRef<THREE.Mesh | null>(null);
  const radarMeshRef = useRef<THREE.Mesh | null>(null);
  const beaconLightRef = useRef<THREE.PointLight | null>(null);
  const spreaderRef = useRef<THREE.Group | null>(null);
  const trucksRef = useRef<{ group: THREE.Group; speed: number; minX: number; maxX: number }[]>([]);
  const buoysRef = useRef<{ group: THREE.Group; initialY: number; phase: number }[]>([]);
  const b04RingRef = useRef<THREE.Mesh | null>(null);

  // Camera transition state
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
    duration: 1200,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });

  const isUserInteractingRef = useRef<boolean>(false);
  const tourTimerRef = useRef<number>(0);
  const currentTourIndexRef = useRef<number>(0);

  // Operational telemetry aggregations
  const flagshipVessel = useMemo(() => {
    return vessels.find(v => v.name.includes('Ocean Star')) || vessels[0] || null;
  }, [vessels]);

  const activeCranesCount = useMemo(() => {
    return cranes.filter(c => c.status === 'ACTIVE').length;
  }, [cranes]);

  // View Presets coordinates
  const viewPresets: Record<ViewPresetId, { position: THREE.Vector3; target: THREE.Vector3; label: string }> = useMemo(() => {
    const flagshipX = isOptimizationApplied ? -28 : 14;
    return {
      aerial: {
        label: '🚁 Port Panorama',
        position: new THREE.Vector3(65, 52, 78),
        target: new THREE.Vector3(0, 4, -8),
      },
      ship: {
        label: '🚢 Mega-Ship',
        position: new THREE.Vector3(flagshipX + 22, 18, 30),
        target: new THREE.Vector3(flagshipX, 7, 7.5),
      },
      cranes: {
        label: '🏗️ STS Cranes',
        position: new THREE.Vector3(-28, 20, -2),
        target: new THREE.Vector3(12, 14, -6),
      },
      yard: {
        label: '📦 Container Yard',
        position: new THREE.Vector3(0, 42, -62),
        target: new THREE.Vector3(0, 5, -34),
      },
      entrance: {
        label: '🌊 Harbour Approach',
        position: new THREE.Vector3(76, 20, 68),
        target: new THREE.Vector3(22, 4, 18),
      },
    };
  }, [isOptimizationApplied]);

  // Camera transition executor
  const transitionToView = useCallback((viewId: ViewPresetId) => {
    setActiveView(viewId);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const preset = viewPresets[viewId];
    if (!preset) return;

    cameraTransitionRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 1200,
      startPos: camera.position.clone(),
      endPos: preset.position.clone(),
      startTarget: controls.target.clone(),
      endTarget: preset.target.clone(),
    };
  }, [viewPresets]);

  const handleSelectView = (viewId: ViewPresetId) => {
    setIsTouring(false);
    transitionToView(viewId);
  };

  const handleToggleTouring = () => {
    setIsTouring(prev => {
      const next = !prev;
      if (next) {
        tourTimerRef.current = performance.now();
        currentTourIndexRef.current = 0;
        transitionToView('aerial');
      }
      return next;
    });
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
  // THREE.JS SCENE SETUP & LIFECYCLE
  // ==========================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Atmosphere Fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      isDark ? 0x071a24 : 0xe0f2fe,
      isDark ? 0.0045 : 0.0032
    );
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 1200);
    camera.position.set(65, 52, 78);
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

    // 4. OrbitControls with Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 18;
    controls.maxDistance = 240;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below sea level
    controls.minPolarAngle = 0.08;
    controls.target.set(0, 4, -8);
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
      isDark ? 0x1e3a5f : 0xffffff,
      isDark ? 1.6 : 2.2
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      isDark ? 0x82b8ff : 0xfff6e3,
      isDark ? 2.0 : 2.8
    );
    sunLight.position.set(75, 95, 55);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 320;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const dockLight1 = new THREE.PointLight(0x0ea5a8, isDark ? 3.5 : 1.2, 70);
    dockLight1.position.set(20, 22, -2);
    scene.add(dockLight1);

    const dockLight2 = new THREE.PointLight(0x38bdf8, isDark ? 3.5 : 1.2, 70);
    dockLight2.position.set(-25, 22, -2);
    scene.add(dockLight2);

    const beaconLight = new THREE.PointLight(0x10b981, isDark ? 6.0 : 2.0, 55);
    beaconLight.position.set(65, 22, 45);
    beaconLightRef.current = beaconLight;
    scene.add(beaconLight);

    // ==========================================
    // REUSABLE GEOMETRIES & MATERIALS (Disposal Tracking)
    // ==========================================
    const sharedGeometries: THREE.BufferGeometry[] = [];
    const sharedMaterials: THREE.Material[] = [];

    const makeStandardMat = (color: number, roughness = 0.5, metalness = 0.2) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      sharedMaterials.push(mat);
      return mat;
    };

    const concreteMat = makeStandardMat(isDark ? 0x243242 : 0x94a3b8, 0.85, 0.08);
    const asphaltMat = makeStandardMat(isDark ? 0x111c26 : 0x334155, 0.92, 0.04);
    const cautionStripeMat = makeStandardMat(0xf59e0b, 0.35, 0.2);
    const darkNavyHullMat = makeStandardMat(0x071e2e, 0.35, 0.45);
    const redKeelMat = makeStandardMat(0xb91c1c, 0.4, 0.2);
    const deckMat = makeStandardMat(isDark ? 0x1e293b : 0x475569, 0.7, 0.2);
    const superstructureMat = makeStandardMat(0xf8fafc, 0.25, 0.1);
    const bridgeGlassMat = makeStandardMat(0x0284c7, 0.1, 0.95);
    const craneOrangeMat = makeStandardMat(0xf97316, 0.35, 0.35);
    const craneWhiteMat = makeStandardMat(0xffffff, 0.3, 0.1);
    const rtgBlueMat = makeStandardMat(0x2563eb, 0.4, 0.25);
    const steelRailMat = makeStandardMat(0x64748b, 0.2, 0.85);

    const containerPalette = [
      0x0ea5a8, // Teal (Maersk)
      0x168a63, // Emerald (Evergreen)
      0xea580c, // Deep Orange (Hapag-Lloyd)
      0x2563eb, // Royal Blue (CMA CGM)
      0xf8fafc, // Pure White (Reefer Cold-Chain)
      0xd97706, // Industrial Amber
      0x9333ea, // Magenta / Purple (ONE)
      0xdc2626, // Crimson Alert
    ];

    const interactiveList: THREE.Object3D[] = [];

    // ==========================================
    // 6. BUILD TERMINAL INFRASTRUCTURE
    // ==========================================
    const portGroup = new THREE.Group();

    // A. Concrete Wharf & Quayside Apron
    const wharfGeo = new THREE.BoxGeometry(140, 4.0, 52);
    sharedGeometries.push(wharfGeo);
    const wharf = new THREE.Mesh(wharfGeo, concreteMat);
    wharf.position.set(0, 2.0, -26);
    wharf.receiveShadow = true;
    wharf.castShadow = true;
    portGroup.add(wharf);

    // Rubber Quay Wall Fenders along the water edge
    const fenderGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.4, 12);
    sharedGeometries.push(fenderGeo);
    const fenderMat = makeStandardMat(0x0a0f14, 0.9, 0.1);
    for (let fx = -65; fx <= 65; fx += 8) {
      const fender = new THREE.Mesh(fenderGeo, fenderMat);
      fender.rotation.z = Math.PI / 2;
      fender.position.set(fx, 2.2, 0.2);
      portGroup.add(fender);
    }

    // Terminal Asphalt Access Roadway
    const roadGeo = new THREE.BoxGeometry(138, 0.12, 14);
    sharedGeometries.push(roadGeo);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 4.07, -14);
    road.receiveShadow = true;
    portGroup.add(road);

    // Road White Line Dividers
    const lineGeo = new THREE.BoxGeometry(3.5, 0.13, 0.25);
    sharedGeometries.push(lineGeo);
    const lineMat = makeStandardMat(0xffffff, 0.4, 0.1);
    for (let lx = -64; lx <= 64; lx += 7) {
      const dash = new THREE.Mesh(lineGeo, lineMat);
      dash.position.set(lx, 4.08, -14);
      portGroup.add(dash);
    }

    // Quayside Caution Edge Stripe (Hazard Yellow)
    const edgeGeo = new THREE.BoxGeometry(140, 0.2, 0.8);
    sharedGeometries.push(edgeGeo);
    const edge = new THREE.Mesh(edgeGeo, cautionStripeMat);
    edge.position.set(0, 4.1, -0.4);
    portGroup.add(edge);

    // Quayside Dual Crane Steel Rails
    [-2.2, -8.6].forEach(zPos => {
      const railGeo = new THREE.BoxGeometry(138, 0.14, 0.35);
      sharedGeometries.push(railGeo);
      const rail = new THREE.Mesh(railGeo, steelRailMat);
      rail.position.set(0, 4.12, zPos);
      portGroup.add(rail);
    });

    // Mooring Bollards
    const bollardGeo = new THREE.CylinderGeometry(0.32, 0.45, 0.85, 12);
    sharedGeometries.push(bollardGeo);
    const bollardMat = makeStandardMat(0x0f172a, 0.3, 0.8);
    for (let bx = -62; bx <= 62; bx += 9) {
      const bollard = new THREE.Mesh(bollardGeo, bollardMat);
      bollard.position.set(bx, 4.45, -0.9);
      bollard.castShadow = true;
      portGroup.add(bollard);
    }

    // ==========================================
    // B. INTERACTIVE BERTH SECTORS (B01 to B06)
    // ==========================================
    const berthPositions: { id: string; x: number; length: number }[] = [
      { id: 'B01', x: -50, length: 22 },
      { id: 'B02', x: -28, length: 22 },
      { id: 'B03', x: -8, length: 18 },
      { id: 'B04', x: 14, length: 24 }, // Primary bottleneck berth
      { id: 'B05', x: 36, length: 20 },
      { id: 'B06', x: 56, length: 20 },
    ];

    berthPositions.forEach(bp => {
      const berthData = berths.find(b => b.id === bp.id);
      const isB04 = bp.id === 'B04';
      const isBottleneck = isB04 && !isOptimizationApplied;
      const isMitigated = isB04 && isOptimizationApplied;

      let statusColor = 0x10b981; // Green
      if (berthData?.status === 'Maintenance' || berthData?.riskLevel === 'MEDIUM') {
        statusColor = 0xf59e0b; // Amber
      } else if (berthData?.riskLevel === 'HIGH' || isBottleneck) {
        statusColor = 0xf43f5e; // Rose / Red
      } else if (isMitigated) {
        statusColor = 0x14b8a6; // Teal controlled
      }

      const berthMarkerGeo = new THREE.BoxGeometry(bp.length - 2, 0.15, 1.2);
      sharedGeometries.push(berthMarkerGeo);
      const markerMat = new THREE.MeshStandardMaterial({
        color: statusColor,
        roughness: 0.3,
        metalness: 0.4,
        emissive: statusColor,
        emissiveIntensity: isBottleneck ? 0.6 : 0.25,
      });
      sharedMaterials.push(markerMat);

      const berthMarker = new THREE.Mesh(berthMarkerGeo, markerMat);
      berthMarker.position.set(bp.x, 4.14, -1.8);
      berthMarker.userData = {
        type: 'berth',
        id: bp.id,
        title: `Quayside Berth ${bp.id}`,
        subtitle: berthData?.name || `Berth ${bp.id}`,
        statusBadge: {
          label: isBottleneck
            ? 'HIGH BOTTLENECK (94%)'
            : isMitigated
            ? 'MITIGATED (78%)'
            : (berthData?.status || 'NORMAL'),
          variant: isBottleneck ? 'danger' : isMitigated ? 'success' : 'info',
        },
        metrics: [
          { label: 'Current Util', value: `${isMitigated ? 64 : berthData?.currentUtilization || 78}%` },
          { label: 'Predicted Peak', value: `${isMitigated ? 78 : berthData?.predictedUtilization || 82}%` },
          { label: 'Queue Count', value: `${isMitigated ? 4 : berthData?.queueCount || 1} vessels` },
          { label: 'Max Cranes', value: `${berthData?.maxCranes || 4} STS` },
        ],
        note: isBottleneck
          ? `Bottleneck projected peak at T+24h (${forecast?.bottleneckConfidence || 91.4}% ML confidence). Recommended optimization available.`
          : isMitigated
          ? 'Traffic reallocated to Berth B02 with twin STS crane priority under optimization plan.'
          : 'Operating nominally within standard safety threshold (<85%).',
      };
      portGroup.add(berthMarker);
      interactiveList.push(berthMarker);

      // Vertical Berth Indicator Pylon
      const pylonGeo = new THREE.CylinderGeometry(0.35, 0.45, 3.2, 12);
      sharedGeometries.push(pylonGeo);
      const pylon = new THREE.Mesh(pylonGeo, concreteMat);
      pylon.position.set(bp.x - bp.length / 2 + 1.2, 5.6, -1.8);
      pylon.castShadow = true;
      portGroup.add(pylon);

      // Illuminated Beacon Top on Pylon
      const beaconGeo = new THREE.SphereGeometry(0.4, 16, 16);
      sharedGeometries.push(beaconGeo);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: statusColor,
        emissive: statusColor,
        emissiveIntensity: 0.8,
      });
      sharedMaterials.push(beaconMat);
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(bp.x - bp.length / 2 + 1.2, 7.4, -1.8);
      portGroup.add(beaconMesh);

      // Warning pulsator ring around Berth B04 if unmitigated bottleneck
      if (isB04 && isBottleneck) {
        const ringGeo = new THREE.RingGeometry(2.5, 3.8, 32);
        sharedGeometries.push(ringGeo);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        });
        sharedMaterials.push(ringMat);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(bp.x, 4.18, -1.8);
        b04RingRef.current = ring;
        portGroup.add(ring);
      }
    });

    // ==========================================
    // C. CARGO VESSELS (ULCV Mega-Ship & Feeders)
    // ==========================================
    const flagshipX = isOptimizationApplied ? -28 : 14;
    const flagshipShipGroup = new THREE.Group();
    flagshipShipGroup.position.set(flagshipX, 0, 7.8);

    // Keel (Crimson Underbody)
    const keelGeo = new THREE.BoxGeometry(68, 3.4, 13.0);
    sharedGeometries.push(keelGeo);
    const keel = new THREE.Mesh(keelGeo, redKeelMat);
    keel.position.y = 1.7;
    keel.castShadow = true;
    keel.receiveShadow = true;
    flagshipShipGroup.add(keel);

    // Upper Navy Hull
    const hullGeo = new THREE.BoxGeometry(68.5, 4.6, 13.6);
    sharedGeometries.push(hullGeo);
    const hull = new THREE.Mesh(hullGeo, darkNavyHullMat);
    hull.position.y = 4.5;
    hull.castShadow = true;
    hull.receiveShadow = true;
    flagshipShipGroup.add(hull);

    // Bulbous Bow
    const bulbGeo = new THREE.SphereGeometry(2.4, 16, 16);
    bulbGeo.scale(2.6, 1, 1);
    sharedGeometries.push(bulbGeo);
    const bulb = new THREE.Mesh(bulbGeo, redKeelMat);
    bulb.position.set(36, 1.7, 0);
    flagshipShipGroup.add(bulb);

    // Bow Flare Wedge (Aerodynamic sharp prow)
    const bowShape = new THREE.Shape();
    bowShape.moveTo(0, -6.8);
    bowShape.lineTo(9.8, 0);
    bowShape.lineTo(0, 6.8);
    bowShape.closePath();
    const bowExtrude = new THREE.ExtrudeGeometry(bowShape, { depth: 7.8, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.2 });
    sharedGeometries.push(bowExtrude);
    const bowMesh = new THREE.Mesh(bowExtrude, darkNavyHullMat);
    bowMesh.rotation.x = Math.PI / 2;
    bowMesh.rotation.z = Math.PI / 2;
    bowMesh.position.set(34.2, 7.8, 0);
    bowMesh.castShadow = true;
    flagshipShipGroup.add(bowMesh);

    // Ship Main Deck
    const deckGeo = new THREE.BoxGeometry(65, 0.45, 13.0);
    sharedGeometries.push(deckGeo);
    const shipDeck = new THREE.Mesh(deckGeo, deckMat);
    shipDeck.position.y = 6.9;
    shipDeck.receiveShadow = true;
    flagshipShipGroup.add(shipDeck);

    // Bridge Accommodation Superstructure
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(-22, 7.1, 0);

    const bridgeLowerGeo = new THREE.BoxGeometry(9.6, 6.0, 11.4);
    sharedGeometries.push(bridgeLowerGeo);
    const bridgeLower = new THREE.Mesh(bridgeLowerGeo, superstructureMat);
    bridgeLower.position.y = 3.0;
    bridgeLower.castShadow = true;
    bridgeGroup.add(bridgeLower);

    const bridgeUpperGeo = new THREE.BoxGeometry(8.2, 2.8, 14.4);
    sharedGeometries.push(bridgeUpperGeo);
    const bridgeUpper = new THREE.Mesh(bridgeUpperGeo, superstructureMat);
    bridgeUpper.position.y = 7.0;
    bridgeUpper.castShadow = true;
    bridgeGroup.add(bridgeUpper);

    // Glass panoramic navigation ribbon
    const bridgeGlassGeo = new THREE.BoxGeometry(8.4, 1.2, 14.6);
    sharedGeometries.push(bridgeGlassGeo);
    const bridgeGlass = new THREE.Mesh(bridgeGlassGeo, bridgeGlassMat);
    bridgeGlass.position.y = 7.2;
    bridgeGroup.add(bridgeGlass);

    // Exhaust Funnel Stack
    const funnelGeo = new THREE.CylinderGeometry(1.4, 1.8, 5.8, 16);
    sharedGeometries.push(funnelGeo);
    const funnelMat = makeStandardMat(0x0ea5a8, 0.3, 0.4);
    const funnel = new THREE.Mesh(funnelGeo, funnelMat);
    funnel.position.set(-2.8, 10.0, 0);
    funnel.rotation.z = -0.12;
    funnel.castShadow = true;
    bridgeGroup.add(funnel);

    // Rotating Radar Scanner
    const mastGeo = new THREE.CylinderGeometry(0.2, 0.3, 6.2, 8);
    sharedGeometries.push(mastGeo);
    const mast = new THREE.Mesh(mastGeo, superstructureMat);
    mast.position.set(1.5, 10.4, 0);
    bridgeGroup.add(mast);

    const radarGeo = new THREE.BoxGeometry(3.4, 0.35, 0.5);
    sharedGeometries.push(radarGeo);
    const radar = new THREE.Mesh(radarGeo, makeStandardMat(0x0ea5a8, 0.2, 0.8));
    radar.position.set(1.5, 13.4, 0);
    radarMeshRef.current = radar;
    bridgeGroup.add(radar);

    flagshipShipGroup.add(bridgeGroup);

    // Container Bays on Flagship (8 Bays, 5 Rows, 3-4 Tiers)
    const containerBoxGeo = new THREE.BoxGeometry(4.6, 1.9, 2.3);
    sharedGeometries.push(containerBoxGeo);

    const shipContainers = new THREE.Group();
    shipContainers.position.set(0, 7.1, 0);

    for (let bay = 0; bay < 8; bay++) {
      const posX = -13.5 + bay * 5.6;
      for (let row = -2; row <= 2; row++) {
        const posZ = row * 2.5;
        const maxTier = (bay >= 6 && Math.abs(row) === 2) ? 2 : (bay === 7 ? 3 : 4);
        for (let tier = 0; tier < maxTier; tier++) {
          const posY = tier * 1.96 + 0.98;
          const colorIdx = (bay * 5 + Math.abs(row) * 3 + tier * 2) % containerPalette.length;
          const cMat = makeStandardMat(containerPalette[colorIdx], 0.6, 0.1);
          const cMesh = new THREE.Mesh(containerBoxGeo, cMat);
          cMesh.position.set(posX, posY, posZ);
          cMesh.castShadow = true;
          cMesh.receiveShadow = true;
          shipContainers.add(cMesh);
        }
      }
    }
    flagshipShipGroup.add(shipContainers);

    flagshipShipGroup.userData = {
      type: 'vessel',
      id: flagshipVessel?.id || 'VES-01',
      title: flagshipVessel?.name || 'MV Ocean Star',
      subtitle: `${flagshipVessel?.shippingCompany || 'Apex Maritime Agency'} • Flag: ${flagshipVessel?.flag || 'Panama'}`,
      statusBadge: {
        label: isOptimizationApplied ? 'REALLOCATED TO B02' : (flagshipVessel?.status || 'Berthing'),
        variant: isOptimizationApplied ? 'success' : 'warning',
      },
      metrics: [
        { label: 'TEU Capacity', value: `${flagshipVessel?.teuCapacity || 15200} TEU` },
        { label: 'Length (LOA)', value: `${flagshipVessel?.lengthMeters || 366}m` },
        { label: 'Draught', value: `${flagshipVessel?.draughtMeters || 15.2}m` },
        { label: 'Berth Assigned', value: isOptimizationApplied ? 'Berth B02' : 'Berth B04' },
        { label: 'Wait Time', value: isOptimizationApplied ? '0.8h (-4.6h saved)' : `${flagshipVessel?.predictedWaitHours || 4.2}h` },
        { label: 'Demurrage Risk', value: isOptimizationApplied ? 'Low (Saved $148k)' : 'High Risk' },
      ],
      note: isOptimizationApplied
        ? 'Applied optimization diverted MV Ocean Star to Berth B02 with twin STS crane priority, avoiding berth congestion.'
        : 'Subject to bunching congestion with Ever Forward at Berth B04. Intervention recommended.',
    };
    portGroup.add(flagshipShipGroup);
    interactiveList.push(flagshipShipGroup);

    // 2. Secondary Feeder Container Ship at Berth B01 (MSC Orion)
    const feederShipGroup = new THREE.Group();
    feederShipGroup.position.set(-50, 0, 7.6);

    const feederKeelGeo = new THREE.BoxGeometry(40, 3.0, 11.0);
    sharedGeometries.push(feederKeelGeo);
    const feederKeel = new THREE.Mesh(feederKeelGeo, redKeelMat);
    feederKeel.position.y = 1.5;
    feederKeel.castShadow = true;
    feederShipGroup.add(feederKeel);

    const feederHullGeo = new THREE.BoxGeometry(40.5, 4.0, 11.4);
    sharedGeometries.push(feederHullGeo);
    const feederHull = new THREE.Mesh(feederHullGeo, makeStandardMat(0x164e63, 0.4, 0.3));
    feederHull.position.y = 4.2;
    feederHull.castShadow = true;
    feederShipGroup.add(feederHull);

    const feederDeckGeo = new THREE.BoxGeometry(38, 0.4, 11.0);
    sharedGeometries.push(feederDeckGeo);
    const feederDeck = new THREE.Mesh(feederDeckGeo, deckMat);
    feederDeck.position.y = 6.3;
    feederShipGroup.add(feederDeck);

    // Feeder Bridge
    const feederBridgeGeo = new THREE.BoxGeometry(6.5, 5.0, 9.5);
    sharedGeometries.push(feederBridgeGeo);
    const feederBridge = new THREE.Mesh(feederBridgeGeo, superstructureMat);
    feederBridge.position.set(-14, 8.8, 0);
    feederBridge.castShadow = true;
    feederShipGroup.add(feederBridge);

    // Feeder Containers (4 Bays)
    for (let bay = 0; bay < 4; bay++) {
      const posX = -6 + bay * 5.2;
      for (let row = -1; row <= 1; row++) {
        const posZ = row * 2.6;
        for (let tier = 0; tier < 3; tier++) {
          const posY = tier * 1.96 + 7.3;
          const cMat = makeStandardMat(containerPalette[(bay * 3 + tier) % containerPalette.length], 0.6, 0.1);
          const cMesh = new THREE.Mesh(containerBoxGeo, cMat);
          cMesh.position.set(posX, posY, posZ);
          cMesh.castShadow = true;
          feederShipGroup.add(cMesh);
        }
      }
    }

    feederShipGroup.userData = {
      type: 'vessel',
      id: 'VES-02',
      title: 'MSC Orion',
      subtitle: 'Feeder Liner • Flag: Liberia',
      statusBadge: { label: 'LOADING (B01)', variant: 'info' },
      metrics: [
        { label: 'TEU Capacity', value: '11,800 TEU' },
        { label: 'Length', value: '294m' },
        { label: 'Current Berth', value: 'Berth B01' },
        { label: 'Cranes Allocated', value: '2 STS' },
      ],
      note: 'Routine cargo discharge on track without schedule deviation.',
    };
    portGroup.add(feederShipGroup);
    interactiveList.push(feederShipGroup);

    // ==========================================
    // D. 5 GIANT STS QUAYSIDE GANTRY CRANES
    // ==========================================
    const cranePositions = [
      { id: 'C01', x: -55, berth: 'B01', status: 'ACTIVE', moves: 34, util: 84 },
      { id: 'C02', x: -44, berth: 'B01', status: 'ACTIVE', moves: 32, util: 81 },
      { id: 'C04', x: -30, berth: 'B02', status: 'ACTIVE', moves: 36, util: 78 },
      { id: 'C03', x: 12, berth: 'B04', status: 'MAINTENANCE', moves: 14, util: 42 },
      { id: 'C05', x: 38, berth: 'B05', status: 'ACTIVE', moves: 30, util: 70 },
    ];

    cranePositions.forEach((craneData, idx) => {
      const crane = new THREE.Group();
      crane.position.set(craneData.x, 4.0, -5.5);

      const isMaintenance = craneData.status === 'MAINTENANCE';

      // 4 Heavy Lattice Gantry Legs
      const legGeo = new THREE.BoxGeometry(1.1, 23, 1.1);
      sharedGeometries.push(legGeo);
      [-3.4, 3.4].forEach(lx => {
        [-2.6, 2.6].forEach(lz => {
          const leg = new THREE.Mesh(legGeo, isMaintenance ? cautionStripeMat : craneOrangeMat);
          leg.position.set(lx, 11.5, lz);
          leg.castShadow = true;
          crane.add(leg);
        });
      });

      // Upper Machinery Portal Deck
      const portalGeo = new THREE.BoxGeometry(8.6, 3.2, 7.2);
      sharedGeometries.push(portalGeo);
      const portal = new THREE.Mesh(portalGeo, craneWhiteMat);
      portal.position.set(0, 23.2, 0);
      portal.castShadow = true;
      crane.add(portal);

      // Horizontal Boom Beam extending over ship deck
      const boomGeo = new THREE.BoxGeometry(2.5, 2.5, 38);
      sharedGeometries.push(boomGeo);
      const boom = new THREE.Mesh(boomGeo, isMaintenance ? cautionStripeMat : craneOrangeMat);
      boom.position.set(0, 25.2, 11.5);
      boom.castShadow = true;
      crane.add(boom);

      // Operator Cab & Trolley
      const trolleyGeo = new THREE.BoxGeometry(3.2, 1.3, 3.2);
      sharedGeometries.push(trolleyGeo);
      const trolley = new THREE.Mesh(trolleyGeo, craneWhiteMat);
      trolley.position.set(0, 23.3, 13);
      crane.add(trolley);

      // Spreader on Crane 01/02 lifting in mid-air
      if (idx === 1) {
        const spreaderGroup = new THREE.Group();
        spreaderGroup.position.set(0, 16.0, 13);

        const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, 6.4);
        sharedGeometries.push(cableGeo);
        [-1.3, 1.3].forEach(caX => {
          const cable = new THREE.Mesh(cableGeo, steelRailMat);
          cable.position.set(caX, 3.2, 0);
          spreaderGroup.add(cable);
        });

        const suspendedC = new THREE.Mesh(containerBoxGeo, makeStandardMat(0x0ea5a8, 0.5, 0.2));
        suspendedC.castShadow = true;
        spreaderGroup.add(suspendedC);

        spreaderRef.current = spreaderGroup;
        crane.add(spreaderGroup);
      }

      // Warning beacon on C03 (Maintenance Crane)
      if (isMaintenance) {
        const warnBeaconGeo = new THREE.SphereGeometry(0.6, 12, 12);
        sharedGeometries.push(warnBeaconGeo);
        const warnBeaconMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.2,
        });
        sharedMaterials.push(warnBeaconMat);
        const warnBeacon = new THREE.Mesh(warnBeaconGeo, warnBeaconMat);
        warnBeacon.position.set(0, 27.2, 0);
        crane.add(warnBeacon);
      }

      crane.userData = {
        type: 'crane',
        id: craneData.id,
        title: `STS Gantry Crane ${craneData.id}`,
        subtitle: `Location: Berth ${craneData.berth}`,
        statusBadge: {
          label: craneData.status,
          variant: isMaintenance ? 'danger' : 'success',
        },
        metrics: [
          { label: 'Moves / Hour', value: `${craneData.moves} moves` },
          { label: 'Utilization', value: `${craneData.util}%` },
          { label: 'Type', value: 'Super Post-Panamax STS' },
          { label: 'Berth Station', value: craneData.berth },
        ],
        note: isMaintenance
          ? 'Reduced motor availability on hoist line. Maintenance team scheduled on current shift.'
          : 'Operating continuously at peak stevedoring throughput.',
      };

      portGroup.add(crane);
      interactiveList.push(crane);
    });

    // ==========================================
    // E. 4 CONTAINER STORAGE YARD BLOCKS (CY-01 to CY-04)
    // ==========================================
    const yardGroup = new THREE.Group();
    yardGroup.position.set(0, 4.15, -36);

    const yardBlocksData = [
      { id: 'CY-01', x: -42, category: 'Dry Freight' },
      { id: 'CY-02', x: -14, category: 'General Cargo' },
      { id: 'CY-03', x: 14, category: 'Reefer Cold-Chain' },
      { id: 'CY-04', x: 42, category: 'Empty / Transshipment' },
    ];

    yardBlocksData.forEach(yb => {
      const actualBlock = yardBlocks.find(y => y.id === yb.id);
      const utilPercent = actualBlock?.utilizationPercent || (yb.id === 'CY-03' ? 88 : 70);
      const teuStaged = actualBlock ? `${actualBlock.occupiedTeu.toLocaleString()} / ${actualBlock.totalTeu.toLocaleString()} TEU` : '12,400 / 16,800 TEU';

      const blockGroup = new THREE.Group();
      blockGroup.position.set(yb.x, 0, 0);

      const padGeo = new THREE.BoxGeometry(22, 0.15, 14);
      sharedGeometries.push(padGeo);
      const pad = new THREE.Mesh(padGeo, concreteMat);
      pad.position.y = 0.08;
      blockGroup.add(pad);

      for (let sRow = 0; sRow < 4; sRow++) {
        const stackZ = -4.5 + sRow * 2.8;
        for (let sCol = 0; sCol < 4; sCol++) {
          const stackX = -7.5 + sCol * 5.0;
          const maxTier = yb.id === 'CY-03' ? 4 : (sRow === 2 ? 3 : 2);
          for (let tier = 0; tier < maxTier; tier++) {
            const posY = tier * 1.96 + 1.05;
            const colorIdx = (sRow * 3 + sCol * 2 + tier) % containerPalette.length;
            const cMat = makeStandardMat(
              yb.id === 'CY-03' && tier % 2 === 0 ? 0xf8fafc : containerPalette[colorIdx],
              0.6,
              0.1
            );
            const cMesh = new THREE.Mesh(containerBoxGeo, cMat);
            cMesh.position.set(stackX, posY, stackZ);
            cMesh.castShadow = true;
            cMesh.receiveShadow = true;
            blockGroup.add(cMesh);
          }
        }
      }

      // RTG crane over block
      const rtg = new THREE.Group();
      rtg.position.set(0, 0, 0);

      const rtgLegGeo = new THREE.BoxGeometry(0.85, 12, 0.85);
      sharedGeometries.push(rtgLegGeo);
      [-9.8, 9.8].forEach(rx => {
        [-6.2, 6.2].forEach(rz => {
          const leg = new THREE.Mesh(rtgLegGeo, rtgBlueMat);
          leg.position.set(rx, 6, rz);
          leg.castShadow = true;
          rtg.add(leg);
        });
      });

      const rtgBeamGeo = new THREE.BoxGeometry(21, 1.4, 13.2);
      sharedGeometries.push(rtgBeamGeo);
      const rtgBeam = new THREE.Mesh(rtgBeamGeo, craneWhiteMat);
      rtgBeam.position.set(0, 12, 0);
      rtgBeam.castShadow = true;
      rtg.add(rtgBeam);

      blockGroup.add(rtg);

      blockGroup.userData = {
        type: 'yard',
        id: yb.id,
        title: `Yard Block ${yb.id}`,
        subtitle: `Category: ${actualBlock?.category || yb.category}`,
        statusBadge: {
          label: `${utilPercent}% OCCUPIED`,
          variant: utilPercent > 80 ? 'warning' : 'success',
        },
        metrics: [
          { label: 'Category', value: actualBlock?.category || yb.category },
          { label: 'TEU Staged', value: teuStaged },
          { label: 'Utilization', value: `${utilPercent}%` },
          { label: 'Congestion Risk', value: actualBlock?.congestionRisk || 'Normal' },
        ],
        note: yb.id === 'CY-03'
          ? 'Elevated reefer utilization due to agricultural arrivals. Continuous power points monitoring active.'
          : 'Yard operations normal with steady dwell turnaround.',
      };

      yardGroup.add(blockGroup);
      interactiveList.push(blockGroup);
    });

    portGroup.add(yardGroup);

    // ==========================================
    // F. HARBOUR MASTER CONTROL TOWER & LIGHTHOUSE
    // ==========================================
    const towerGroup = new THREE.Group();
    towerGroup.position.set(65, 4.0, 45);

    const towerBaseGeo = new THREE.CylinderGeometry(2.8, 3.6, 18, 16);
    sharedGeometries.push(towerBaseGeo);
    const towerBase = new THREE.Mesh(towerBaseGeo, superstructureMat);
    towerBase.position.y = 9;
    towerBase.castShadow = true;
    towerGroup.add(towerBase);

    const towerCabGeo = new THREE.CylinderGeometry(4.2, 3.4, 3.6, 16);
    sharedGeometries.push(towerCabGeo);
    const towerCab = new THREE.Mesh(towerCabGeo, bridgeGlassMat);
    towerCab.position.y = 19;
    towerGroup.add(towerCab);

    const towerDomeGeo = new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    sharedGeometries.push(towerDomeGeo);
    const towerDome = new THREE.Mesh(towerDomeGeo, makeStandardMat(0x0ea5a8, 0.2, 0.8));
    towerDome.position.y = 20.8;
    towerGroup.add(towerDome);

    towerGroup.userData = {
      type: 'tower',
      id: 'TOWER-01',
      title: 'Harbour Master Operations Tower',
      subtitle: 'Sector Alpha Telemetry & VTS Station',
      statusBadge: { label: 'ONLINE / 24-7', variant: 'info' },
      metrics: [
        { label: 'VTS Channel', value: 'VHF 16 / 12' },
        { label: 'Radar Sweep', value: '3.2 RPM' },
        { label: 'Wind / Tide', value: '8 kts / +0.4m' },
        { label: 'AIS Feeds', value: 'Active' },
      ],
      note: 'Continuous vessel traffic supervision and automated tug/pilot dispatch monitoring.',
    };
    portGroup.add(towerGroup);
    interactiveList.push(towerGroup);

    // ==========================================
    // G. NAVIGATION BUOYS (Red & Green)
    // ==========================================
    const buoysList: { group: THREE.Group; initialY: number; phase: number }[] = [];
    const buoyConfigs = [
      { x: 50, z: 32, color: 0x10b981 },
      { x: 20, z: 45, color: 0xef4444 },
      { x: -35, z: 40, color: 0x10b981 },
    ];

    buoyConfigs.forEach((bc, idx) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bc.x, 1.2, bc.z);

      const bGeo = new THREE.CylinderGeometry(0.85, 1.3, 2.6, 12);
      sharedGeometries.push(bGeo);
      const bMesh = new THREE.Mesh(bGeo, makeStandardMat(bc.color, 0.4, 0.3));
      bGroup.add(bMesh);

      const blGeo = new THREE.SphereGeometry(0.35, 12, 12);
      sharedGeometries.push(blGeo);
      const blMat = new THREE.MeshStandardMaterial({
        color: bc.color,
        emissive: bc.color,
        emissiveIntensity: 1.4,
      });
      sharedMaterials.push(blMat);
      const blMesh = new THREE.Mesh(blGeo, blMat);
      blMesh.position.y = 1.8;
      bGroup.add(blMesh);

      portGroup.add(bGroup);
      buoysList.push({ group: bGroup, initialY: 1.2, phase: idx * 1.5 });
    });
    buoysRef.current = buoysList;

    // ==========================================
    // H. INTERNAL TERMINAL VEHICLES (TRUCKS)
    // ==========================================
    const terminalTrucks: { group: THREE.Group; speed: number; minX: number; maxX: number }[] = [];
    const truckParams = [
      { startX: -35, laneZ: -12.5, speed: 0.12, color: 0x0ea5a8 },
      { startX: 10, laneZ: -12.5, speed: 0.14, color: 0xea580c },
      { startX: 40, laneZ: -15.5, speed: -0.13, color: 0x2563eb },
      { startX: -15, laneZ: -15.5, speed: -0.11, color: 0x168a63 },
    ];

    truckParams.forEach(tp => {
      const trGroup = new THREE.Group();
      trGroup.position.set(tp.startX, 4.22, tp.laneZ);

      const cabGeo = new THREE.BoxGeometry(2.4, 1.9, 1.8);
      sharedGeometries.push(cabGeo);
      const cabMesh = new THREE.Mesh(cabGeo, makeStandardMat(0x38bdf8, 0.4, 0.3));
      cabMesh.position.set(tp.speed > 0 ? 2.0 : -2.0, 0.95, 0);
      cabMesh.castShadow = true;
      trGroup.add(cabMesh);

      const bedGeo = new THREE.BoxGeometry(5.2, 0.4, 2.0);
      sharedGeometries.push(bedGeo);
      const bedMesh = new THREE.Mesh(bedGeo, steelRailMat);
      bedMesh.position.set(tp.speed > 0 ? -1.8 : 1.8, 0.4, 0);
      bedMesh.castShadow = true;
      trGroup.add(bedMesh);

      const contMesh = new THREE.Mesh(containerBoxGeo, makeStandardMat(tp.color, 0.6, 0.1));
      contMesh.position.set(tp.speed > 0 ? -1.8 : 1.8, 1.55, 0);
      contMesh.castShadow = true;
      trGroup.add(contMesh);

      portGroup.add(trGroup);
      terminalTrucks.push({
        group: trGroup,
        speed: tp.speed,
        minX: -60,
        maxX: 60,
      });
    });
    trucksRef.current = terminalTrucks;

    // ==========================================
    // I. HARBOUR WATERWAY WITH REFLECTIONS
    // ==========================================
    const oceanGeo = new THREE.PlaneGeometry(280, 260, 48, 48);
    sharedGeometries.push(oceanGeo);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x061c2b : 0x0284c7,
      roughness: 0.16,
      metalness: 0.88,
      transparent: true,
      opacity: 0.92,
    });
    sharedMaterials.push(oceanMat);

    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, 1.0, 50);
    ocean.receiveShadow = true;
    oceanMeshRef.current = ocean;
    scene.add(ocean);

    scene.add(portGroup);
    interactiveMeshesRef.current = interactiveList;

    // ==========================================
    // 7. RAYCASTING & CLICK INTERACTION
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownTime = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const getIntersectedObject = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, true);
      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.type && hitObj.parent && hitObj.parent !== scene) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData?.type) {
          return hitObj;
        }
      }
      return null;
    };

    const onPointerMove = (e: MouseEvent) => {
      const hit = getIntersectedObject(e);
      if (hit) {
        renderer.domElement.style.cursor = 'pointer';
      } else {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      pointerDownTime = performance.now();
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: MouseEvent) => {
      const clickDuration = performance.now() - pointerDownTime;
      const moveDistance = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);

      if (clickDuration < 350 && moveDistance < 6) {
        const hit = getIntersectedObject(e);
        if (hit && hit.userData?.type) {
          setSelectedEntity(hit.userData as SelectedEntity);
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousemove', onPointerMove);
    domEl.addEventListener('mousedown', onPointerDown);
    domEl.addEventListener('mouseup', onPointerUp);

    // ==========================================
    // 8. ANIMATION LOOP & LIFECYCLE
    // ==========================================
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth camera transition interpolation (Cubic easeInOut)
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

      // Automated Touring mode cycling
      if (isTouring && !isUserInteractingRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.55;

        if (performance.now() - tourTimerRef.current > 8000) {
          tourTimerRef.current = performance.now();
          const presetsKeys: ViewPresetId[] = ['aerial', 'ship', 'cranes', 'yard', 'entrance'];
          currentTourIndexRef.current = (currentTourIndexRef.current + 1) % presetsKeys.length;
          transitionToView(presetsKeys[currentTourIndexRef.current]);
        }
      } else {
        controls.autoRotate = false;
      }

      controls.update();

      // Rotate Radars
      if (radarMeshRef.current) {
        radarMeshRef.current.rotation.y = time * 3.2;
      }

      // Pulse lighthouse beacon
      if (beaconLightRef.current) {
        beaconLightRef.current.intensity = (Math.sin(time * 3.5) + 1.2) * (isDark ? 3.5 : 1.2);
      }

      // Crane Spreader Gentle Hoist
      if (spreaderRef.current) {
        spreaderRef.current.position.y = 15.5 + Math.sin(time * 0.9) * 2.2;
      }

      // Pulse Bottleneck ring at B04
      if (b04RingRef.current) {
        b04RingRef.current.rotation.z = time * 0.8;
        const scale = 1.0 + Math.sin(time * 2.5) * 0.12;
        b04RingRef.current.scale.set(scale, scale, 1);
      }

      // Buoys gentle ocean bobbing
      buoysRef.current.forEach(b => {
        b.group.position.y = b.initialY + Math.sin(time * 2.0 + b.phase) * 0.22;
        b.group.rotation.z = Math.sin(time * 1.5 + b.phase) * 0.08;
      });

      // Terminal Trucks Logistics movement along roads
      trucksRef.current.forEach(tr => {
        tr.group.position.x += tr.speed;
        if (tr.speed > 0 && tr.group.position.x > tr.maxX) {
          tr.group.position.x = tr.minX;
        } else if (tr.speed < 0 && tr.group.position.x < tr.minX) {
          tr.group.position.x = tr.maxX;
        }
      });

      // Ocean Wave vertex displacement
      if (oceanMeshRef.current) {
        const geo = oceanMeshRef.current.geometry as THREE.PlaneGeometry;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          const wave = Math.sin(u * 0.11 + time * 1.6) * 0.24 + Math.cos(v * 0.13 + time * 1.3) * 0.18;
          pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
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

    // 10. Clean Cleanup & Resource Disposal on Unmount
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousemove', onPointerMove);
      domEl.removeEventListener('mousedown', onPointerDown);
      domEl.removeEventListener('mouseup', onPointerUp);

      controls.dispose();

      sharedGeometries.forEach(g => g.dispose());
      sharedMaterials.forEach(m => m.dispose());

      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [isDark, isOptimizationApplied, berths, cranes, vessels, yardBlocks, forecast, transitionToView]);

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-border-subtle bg-surface shadow-elevated transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-canvas flex flex-col' : className
      }`}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className={`w-full relative cursor-grab active:cursor-grabbing select-none ${
          isFullscreen ? 'flex-1 h-full' : heightClass
        }`}
      />

      {/* Top Left HUD: Port Identity & Telemetry */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl glass-card text-xs shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-teal to-cyan-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-text-main flex items-center gap-2">
              <span className="text-sm">Sector Alpha Container Terminal</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40">
                {isDemoUser ? 'SIMULATED TWIN • THREE.JS' : 'TELEMETRY SYNCED • THREE.JS'}
              </span>
            </div>
            <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5 font-medium">
              <span>Berths: <strong>B01 – B06</strong></span>
              <span>•</span>
              <span>STS Cranes: <strong>{activeCranesCount} Units Active</strong></span>
              <span>•</span>
              <span>Flagship: <strong className="text-brand-teal">{flagshipVessel?.name || 'MV Ocean Star'}</strong> ({flagshipVessel?.teuCapacity?.toLocaleString() || '15,200'} TEU)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Right Controls & Indicators */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-xs text-text-main font-semibold shadow-xs">
          <span className={`w-2 h-2 rounded-full ${isOptimizationApplied ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
          <span>{isOptimizationApplied ? 'Optimized Scenario Active' : 'Bottleneck Active (B04)'}</span>
        </div>

        <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card text-xs text-text-muted font-medium shadow-xs">
          <Compass className="w-3.5 h-3.5 text-text-caption" />
          <span>Click 3D objects to inspect</span>
        </div>
      </div>

      {/* Interactive Entity Inspection Card Overlay */}
      {selectedEntity && (
        <div className="absolute top-20 right-4 z-20 w-80 max-w-[calc(100vw-2rem)] glass-card rounded-2xl p-4 shadow-xl border border-border-subtle animate-in fade-in slide-in-from-right duration-200 pointer-events-auto">
          <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-surface-subtle text-brand-teal border border-border-subtle">
                {selectedEntity.type === 'vessel' ? (
                  <Ship className="w-4 h-4" />
                ) : selectedEntity.type === 'berth' ? (
                  <Anchor className="w-4 h-4" />
                ) : selectedEntity.type === 'crane' ? (
                  <Cpu className="w-4 h-4" />
                ) : selectedEntity.type === 'yard' ? (
                  <Layers className="w-4 h-4" />
                ) : (
                  <Building className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-text-main">{selectedEntity.title}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedEntity.statusBadge.variant === 'danger'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                        : selectedEntity.statusBadge.variant === 'warning'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {selectedEntity.statusBadge.label}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">{selectedEntity.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
              title="Close telemetry card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-2 py-3">
            {selectedEntity.metrics.map((m, idx) => (
              <div key={idx} className="bg-surface-subtle/70 rounded-xl p-2 border border-border-subtle">
                <div className="text-[10px] font-medium text-text-muted">{m.label}</div>
                <div className="text-xs font-bold text-text-main mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>

          {selectedEntity.note && (
            <p className="text-[11px] text-text-muted leading-relaxed pt-2 border-t border-border-subtle">
              {selectedEntity.note}
            </p>
          )}
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Preset Angle Buttons */}
        <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl glass-card shadow-sm">
          {(['aerial', 'ship', 'cranes', 'yard', 'entrance'] as ViewPresetId[]).map(id => {
            const item = viewPresets[id];
            return (
              <button
                key={id}
                onClick={() => handleSelectView(id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  activeView === id
                    ? 'bg-brand-teal text-white shadow-xs'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-subtle'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Action Toggles */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl glass-card shadow-sm">
          <button
            onClick={handleToggleTouring}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isTouring
                ? 'bg-brand-teal text-white shadow-xs'
                : 'text-text-muted hover:text-text-main hover:bg-surface-subtle'
            }`}
            title={isTouring ? 'Pause Camera Tour' : 'Start Camera Tour'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTouring ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isTouring ? 'Touring' : 'Tour'}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Port3DOverview;
