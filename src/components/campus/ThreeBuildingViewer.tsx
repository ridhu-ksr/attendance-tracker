import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Building2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Grid,
  Box,
} from 'lucide-react';
import {
  CAMPUS_BUILDINGS,
  CampusBuilding,
  EvaluatedCampusRoom,
  formatTime12h,
} from '../../data/campusSpaceData';

interface ThreeBuildingViewerProps {
  selectedBuildingId: string;
  selectedFloor: number | 'ALL';
  selectedRoomId: string;
  rooms: EvaluatedCampusRoom[];
  onSelectBuilding: (buildingId: string) => void;
  onSelectFloor: (floor: number | 'ALL') => void;
  onSelectRoom: (room: EvaluatedCampusRoom) => void;
  isExpandedModal?: boolean;
  onToggleExpand?: () => void;
}

export const ThreeBuildingViewer: React.FC<ThreeBuildingViewerProps> = ({
  selectedBuildingId,
  selectedFloor,
  selectedRoomId,
  rooms,
  onSelectBuilding,
  onSelectFloor,
  onSelectRoom,
  isExpandedModal = false,
  onToggleExpand,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d_grid'>('3d');
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [hoveredRoom, setHoveredRoom] = useState<{
    room: EvaluatedCampusRoom;
    x: number;
    y: number;
  } | null>(null);

  // Camera orbit spherical angles
  const orbitRef = useRef<{
    theta: number; // horizontal angle
    phi: number;   // vertical angle
    radius: number;
    targetTheta: number;
    targetPhi: number;
    targetRadius: number;
    isDragging: boolean;
    prevX: number;
    prevY: number;
  }>({
    theta: -0.65,
    phi: 1.15,
    radius: 15.5,
    targetTheta: -0.65,
    targetPhi: 1.15,
    targetRadius: 15.5,
    isDragging: false,
    prevX: 0,
    prevY: 0,
  });

  const activeBuilding: CampusBuilding =
    CAMPUS_BUILDINGS.find((b) => b.buildingId === selectedBuildingId) ||
    CAMPUS_BUILDINGS[0];

  const buildingRooms = rooms.filter(
    (r) => r.buildingId === activeBuilding.buildingId
  );

  // Set camera preset angle
  const setCameraPreset = (preset: 'front' | 'back' | 'left' | 'right' | 'top' | 'iso') => {
    const o = orbitRef.current;
    if (preset === 'front') {
      o.targetTheta = 0;
      o.targetPhi = 1.28;
    } else if (preset === 'back') {
      o.targetTheta = Math.PI;
      o.targetPhi = 1.28;
    } else if (preset === 'left') {
      o.targetTheta = -Math.PI / 2;
      o.targetPhi = 1.28;
    } else if (preset === 'right') {
      o.targetTheta = Math.PI / 2;
      o.targetPhi = 1.28;
    } else if (preset === 'top') {
      o.targetTheta = 0;
      o.targetPhi = 0.32;
    } else {
      o.targetTheta = -0.65;
      o.targetPhi = 1.15;
      o.targetRadius = 15.5;
    }
  };

  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 270;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglSupported(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.018);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);

    // 3-Point Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xf0f7ff, 1.15);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    keyLight.position.set(14, 22, 16);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    fillLight.position.set(-14, 10, -10);
    scene.add(fillLight);

    // Ground courtyard platform
    const groundGeo = new THREE.BoxGeometry(14, 0.4, 11);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.75,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, -0.2, 0);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Green lawn border
    const lawnGeo = new THREE.BoxGeometry(15.6, 0.25, 12.6);
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.9,
    });
    const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
    lawnMesh.position.set(0, -0.35, 0);
    scene.add(lawnMesh);

    // Build stacked 3D building floors (GF to 5F)
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);

    const interactableMeshes: THREE.Mesh[] = [];
    const totalFloors = 5; // 0 (GF) to 4 (4F)
    const floorHeight = 1.28;
    const bWidth = 7.4;
    const bDepth = 5.4;

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
      metalness: 0.12,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.3,
    });
    const glassCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.15,
      metalness: 0.2,
      transmission: 0.35,
      transparent: true,
      opacity: 0.85,
    });

    // Central glass atrium column
    const atriumGeo = new THREE.BoxGeometry(1.7, totalFloors * floorHeight + 0.6, bDepth + 0.25);
    const atriumMesh = new THREE.Mesh(atriumGeo, glassCoreMat);
    atriumMesh.position.set(0, (totalFloors * floorHeight) / 2, 0);
    buildingGroup.add(atriumMesh);

    for (let fl = 0; fl < totalFloors; fl++) {
      const yCenter = fl * floorHeight + floorHeight / 2;
      const isFloorDimmed = selectedFloor !== 'ALL' && selectedFloor !== fl;
      const floorOpacity = isFloorDimmed ? 0.28 : 1.0;

      // Floor concrete slab
      const slabMat = concreteMat.clone();
      if (isFloorDimmed) {
        slabMat.transparent = true;
        slabMat.opacity = floorOpacity;
      }
      const slabGeo = new THREE.BoxGeometry(bWidth, floorHeight * 0.86, bDepth);
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.set(0, yCenter, 0);
      buildingGroup.add(slabMesh);

      // Floor divider ledge
      const ledgeGeo = new THREE.BoxGeometry(bWidth + 0.24, 0.14, bDepth + 0.24);
      const ledgeMesh = new THREE.Mesh(ledgeGeo, darkTrimMat);
      ledgeMesh.position.set(0, (fl + 1) * floorHeight, 0);
      buildingGroup.add(ledgeMesh);

      // Highlight ring if this floor is actively selected
      if (selectedFloor === fl) {
        const ringGeo = new THREE.EdgesGeometry(
          new THREE.BoxGeometry(bWidth + 0.36, floorHeight + 0.08, bDepth + 0.36)
        );
        const ringMat = new THREE.LineBasicMaterial({ color: 0x1d4ed8 });
        const ringLines = new THREE.LineSegments(ringGeo, ringMat);
        ringLines.position.set(0, yCenter, 0);
        buildingGroup.add(ringLines);
      }

      // Create 8 room window bays around the perimeter of this floor (Front, Back, Left, Right)
      const bayPositions: { x: number; z: number; w: number; d: number; idx: number }[] = [
        // Front left & right bays
        { x: -2.25, z: bDepth / 2 + 0.06, w: 2.1, d: 0.16, idx: 0 },
        { x: 2.25, z: bDepth / 2 + 0.06, w: 2.1, d: 0.16, idx: 1 },
        // Back left & right bays
        { x: -2.25, z: -bDepth / 2 - 0.06, w: 2.1, d: 0.16, idx: 2 },
        { x: 2.25, z: -bDepth / 2 - 0.06, w: 2.1, d: 0.16, idx: 3 },
        // Left side bays
        { x: -bWidth / 2 - 0.06, z: 1.35, w: 0.16, d: 1.8, idx: 4 },
        { x: -bWidth / 2 - 0.06, z: -1.35, w: 0.16, d: 1.8, idx: 5 },
        // Right side bays
        { x: bWidth / 2 + 0.06, z: 1.35, w: 0.16, d: 1.8, idx: 6 },
        { x: bWidth / 2 + 0.06, z: -1.35, w: 0.16, d: 1.8, idx: 7 },
      ];

      const floorRooms = buildingRooms.filter((r) => r.floor === fl);

      bayPositions.forEach((bp) => {
        // Map to actual room on this floor or deterministic building room
        const mappedRoom: EvaluatedCampusRoom =
          floorRooms[bp.idx % Math.max(1, floorRooms.length)] ||
          buildingRooms[(fl * 3 + bp.idx) % Math.max(1, buildingRooms.length)] ||
          rooms[0];

        // Determine color from mappedRoom availabilityState, with realistic facade distribution
        let stateColor = 0x10b981; // Green (#10B981)
        const syntheticSeed = (fl * 7 + bp.idx * 3) % 6;
        if (floorRooms.length > 0 && bp.idx < floorRooms.length) {
          if (mappedRoom.availabilityState === 'green') stateColor = 0x10b981;
          else if (mappedRoom.availabilityState === 'yellow') stateColor = 0xf59e0b;
          else stateColor = 0xef4444;
        } else {
          if (syntheticSeed === 0 || syntheticSeed === 3) stateColor = 0x10b981;
          else if (syntheticSeed === 1 || syntheticSeed === 4) stateColor = 0xf59e0b;
          else stateColor = 0xef4444;
        }

        const isSelectedRoom = mappedRoom && mappedRoom.roomId === selectedRoomId && bp.idx === 0 && fl === mappedRoom.floor;
        const bayGeo = new THREE.BoxGeometry(bp.w, floorHeight * 0.64, bp.d);
        const bayMat = new THREE.MeshStandardMaterial({
          color: stateColor,
          emissive: stateColor,
          emissiveIntensity: isSelectedRoom ? 0.55 : 0.22,
          roughness: 0.25,
          metalness: 0.1,
          transparent: isFloorDimmed,
          opacity: floorOpacity,
        });

        const bayMesh = new THREE.Mesh(bayGeo, bayMat);
        bayMesh.position.set(bp.x, yCenter, bp.z);
        bayMesh.userData = { room: mappedRoom, floor: fl };
        buildingGroup.add(bayMesh);
        interactableMeshes.push(bayMesh);
      });
    }

    // Roof Penthouse Crown
    const roofGeo = new THREE.BoxGeometry(4.6, 0.95, 3.4);
    const roofMesh = new THREE.Mesh(roofGeo, concreteMat);
    roofMesh.position.set(0, totalFloors * floorHeight + 0.45, 0);
    buildingGroup.add(roofMesh);

    // Center building vertically
    buildingGroup.position.y = -2.8;

    // Raycaster for room hover and click
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      orbitRef.current.isDragging = true;
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const o = orbitRef.current;

      if (o.isDragging) {
        const dx = e.clientX - o.prevX;
        const dy = e.clientY - o.prevY;
        o.targetTheta -= dx * 0.011;
        o.targetPhi = Math.max(0.28, Math.min(1.48, o.targetPhi - dy * 0.009));
        o.prevX = e.clientX;
        o.prevY = e.clientY;
        setHoveredRoom(null);
        return;
      }

      // Raycast hover
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(interactableMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const rm = hit.userData?.room as EvaluatedCampusRoom | undefined;
        if (rm) {
          renderer.domElement.style.cursor = 'pointer';
          setHoveredRoom({
            room: rm,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
          return;
        }
      }
      renderer.domElement.style.cursor = 'grab';
      setHoveredRoom(null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const wasDragging =
        Math.abs(e.clientX - orbitRef.current.prevX) > 4 ||
        Math.abs(e.clientY - orbitRef.current.prevY) > 4;
      orbitRef.current.isDragging = false;

      if (!wasDragging) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(interactableMeshes, false);
        if (intersects.length > 0) {
          const rm = intersects[0].object.userData?.room as
            | EvaluatedCampusRoom
            | undefined;
          if (rm) {
            onSelectRoom(rm);
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.targetRadius = Math.max(
        9.5,
        Math.min(24, orbitRef.current.targetRadius + e.deltaY * 0.01)
      );
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('wheel', handleWheel, { passive: false });

    // Animation loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const o = orbitRef.current;
      o.theta += (o.targetTheta - o.theta) * 0.12;
      o.phi += (o.targetPhi - o.phi) * 0.12;
      o.radius += (o.targetRadius - o.radius) * 0.12;

      camera.position.x = o.radius * Math.sin(o.phi) * Math.sin(o.theta);
      camera.position.y = o.radius * Math.cos(o.phi);
      camera.position.z = o.radius * Math.sin(o.phi) * Math.cos(o.theta);
      camera.lookAt(0, 0.3, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 420;
      const h = container.clientHeight || 270;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      domElem.removeEventListener('wheel', handleWheel);
      domElem.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [
    viewMode,
    selectedBuildingId,
    selectedFloor,
    selectedRoomId,
    rooms,
    isExpandedModal,
  ]);

  const floorTabs: { label: string; value: number | 'ALL' }[] = [
    { label: 'Ground', value: 0 },
    { label: '1st Floor', value: 1 },
    { label: '2nd Floor', value: 2 },
    { label: '3rd Floor', value: 3 },
  ];

  return (
    <div
      className={`rounded-2xl bg-white/95 backdrop-blur-md border border-blue-200/90 shadow-[0_16px_44px_rgba(15,23,42,0.22)] overflow-hidden flex flex-col ${
        isExpandedModal ? 'w-full h-[540px]' : 'w-full h-full'
      }`}
    >
      {/* Top Dark Slate Header matching Reference Image */}
      <div className="bg-slate-800/95 text-white px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            3D Building Viewer
          </span>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-700/90 border border-slate-500/50 text-[11px] font-medium text-blue-100">
            <Building2 className="w-3 h-3 text-blue-300" />
            <select
              value={activeBuilding.buildingId}
              onChange={(e) => onSelectBuilding(e.target.value)}
              aria-label="Select Campus Building"
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              {CAMPUS_BUILDINGS.map((b) => (
                <option key={b.buildingId} value={b.buildingId} className="text-slate-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 3D / 2D Fallback Toggle for Accessibility */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === '3d' ? '2d_grid' : '3d')}
            className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-semibold text-blue-100 inline-flex items-center gap-1 cursor-pointer"
            title="Toggle 3D WebGL / 2D Floor Grid Fallback"
          >
            {viewMode === '3d' ? <Grid className="w-3 h-3" /> : <Box className="w-3 h-3" />}
            <span>{viewMode === '3d' ? '2D Grid' : '3D View'}</span>
          </button>

          <div className="px-2.5 py-1 rounded-full bg-white text-slate-800 text-[10px] font-semibold inline-flex items-center gap-1 shadow-xs">
            <RotateCw className="w-3 h-3 text-blue-600" />
            <span>Drag to rotate</span>
          </div>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
              title={isExpandedModal ? 'Minimize 3D Viewer' : 'Expand 3D Viewer'}
            >
              {isExpandedModal ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3D Viewport or 2D Floor Fallback */}
      {viewMode === '3d' && webglSupported ? (
        <div className="relative flex-1 min-h-[195px] bg-gradient-to-b from-sky-200/80 via-blue-100/70 to-slate-200/90 select-none overflow-hidden">
          <div ref={mountRef} className="w-full h-full" />

          {/* Left & Right Curved Rotation Arrows matching Reference Image */}
          <button
            type="button"
            onClick={() => {
              orbitRef.current.targetTheta -= 0.55;
            }}
            aria-label="Rotate building left"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-blue-700 shadow-md border border-blue-200 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              orbitRef.current.targetTheta += 0.55;
            }}
            aria-label="Rotate building right"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-blue-700 shadow-md border border-blue-200 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Camera Inspection Presets Bar (Front / Back / Left / Right / Top / Zoom) */}
          <div className="absolute top-2 left-2.5 flex flex-wrap items-center gap-1 z-10">
            {(['front', 'left', 'right', 'back', 'top'] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setCameraPreset(side)}
                className="px-1.5 py-0.5 rounded bg-slate-900/65 hover:bg-blue-700 text-white text-[9px] font-semibold uppercase tracking-wider backdrop-blur-xs cursor-pointer"
              >
                {side}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                orbitRef.current.targetRadius = Math.max(
                  9.5,
                  orbitRef.current.targetRadius - 2
                );
              }}
              className="p-0.5 rounded bg-slate-900/65 hover:bg-blue-700 text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                orbitRef.current.targetRadius = Math.min(
                  24,
                  orbitRef.current.targetRadius + 2
                );
              }}
              className="p-0.5 rounded bg-slate-900/65 hover:bg-blue-700 text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
          </div>

          {/* Bottom-Right N/S/W Orientation Cube matching Reference Image */}
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            title="Reset Isometric View"
            className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-xl bg-white/90 border border-blue-200 shadow-md flex flex-col items-center justify-center text-[9px] font-extrabold text-blue-900 cursor-pointer hover:bg-white"
          >
            <span className="text-blue-600 leading-none">N</span>
            <div className="flex items-center gap-1.5 leading-none mt-0.5">
              <span>W</span>
              <span>S</span>
            </div>
          </button>

          {/* Hover Room Tooltip (Section 9) */}
          {hoveredRoom && (
            <div
              className="pointer-events-none absolute z-20 px-3 py-2 rounded-xl bg-slate-900/95 text-white text-[11px] shadow-xl border border-slate-700 min-w-[165px]"
              style={{
                left: Math.min(220, Math.max(8, hoveredRoom.x + 10)),
                top: Math.max(8, hoveredRoom.y - 55),
              }}
            >
              <div className="flex items-center justify-between gap-2 font-bold">
                <span>Room {hoveredRoom.room.roomId}</span>
                <span
                  className={
                    hoveredRoom.room.availabilityState === 'green'
                      ? 'text-emerald-400'
                      : hoveredRoom.room.availabilityState === 'yellow'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }
                >
                  {hoveredRoom.room.isCurrentlyFree ? 'Available' : 'Occupied'}
                </span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {formatTime12h(hoveredRoom.room.availableFrom)} –{' '}
                {formatTime12h(hoveredRoom.room.availableUntil)}
              </div>
              <div className="text-[10px] text-blue-200">
                Capacity: {hoveredRoom.room.capacity} • {hoveredRoom.room.matchPercentage}% Match
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Accessible 2D Stacked Floor Grid Fallback */
        <div className="flex-1 min-h-[195px] p-3 bg-slate-50 overflow-y-auto space-y-2">
          {[3, 2, 1, 0].map((fl) => {
            const flRooms = buildingRooms.filter((r) => r.floor === fl);
            return (
              <div
                key={fl}
                className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
              >
                <span className="text-xs font-bold text-slate-700 w-16">
                  {fl === 0 ? 'GF' : `${fl}F`}
                </span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {(flRooms.length > 0 ? flRooms : rooms.slice(0, 3)).map((rm) => (
                    <button
                      key={`${fl}-${rm.roomId}`}
                      type="button"
                      onClick={() => onSelectRoom(rm)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer ${
                        rm.availabilityState === 'green'
                          ? 'bg-emerald-500'
                          : rm.availabilityState === 'yellow'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    >
                      {rm.roomId} ({rm.capacity})
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Floor Selector Pills matching Reference Image (`Ground | 1st Floor | 2nd Floor | 3rd Floor`) */}
      <div className="px-3 py-2 bg-white border-t border-slate-200/90 flex items-center justify-between gap-1.5">
        {floorTabs.map((tab) => {
          const isActive =
            selectedFloor === tab.value ||
            (selectedFloor === 'ALL' && tab.value === 0);
          return (
            <button
              key={String(tab.value)}
              type="button"
              onClick={() =>
                onSelectFloor(selectedFloor === tab.value ? 'ALL' : tab.value)
              }
              className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
