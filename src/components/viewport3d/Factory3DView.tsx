import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ProjectData, LayoutObject } from '../../core/models/types';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  CheckCircle,
  Timer,
  Zap,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

interface Factory3DViewProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

export const Factory3DView: React.FC<Factory3DViewProps> = ({ project }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showSpaghetti, setShowSpaghetti] = useState(true);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [targetBatch, setTargetBatch] = useState(30);
  const [isContinuous, setIsContinuous] = useState(false);

  const [completedCount, setCompletedCount] = useState(0);
  const [wipCount, setWipCount] = useState(0);
  const [throughput, setThroughput] = useState(0);
  const [elapsedTimeSec, setElapsedTimeSec] = useState(0);
  const [isBatchFinished, setIsBatchFinished] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const spaghettiGroupRef = useRef<THREE.Group | null>(null);
  const productsGroupRef = useRef<THREE.Group | null>(null);
  const activeProductsRef = useRef<any[]>([]);

  const simStateRef = useRef({
    isRunning: false,
    speed: 1,
    timer: 0,
    spawned: 0,
    completed: 0,
    elapsed: 0,
    targetBatch: 30,
    isContinuous: false,
  });

  useEffect(() => {
    simStateRef.current.isRunning = isSimRunning;
    simStateRef.current.speed = simSpeed;
    simStateRef.current.targetBatch = targetBatch;
    simStateRef.current.isContinuous = isContinuous;
  }, [isSimRunning, simSpeed, targetBatch, isContinuous]);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0b0f19);
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.015);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    cameraRef.current = camera;
    camera.position.set(16, 22, 26);
    camera.lookAt(12, 0, 16);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    // 5. Floor & Grid
    const floorWidth = project.facility.widthMm / 1000;
    const floorLength = project.facility.lengthMm / 1000;

    const floorGeo = new THREE.PlaneGeometry(floorWidth, floorLength);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(floorWidth / 2, 0, floorLength / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(Math.max(floorWidth, floorLength), Math.max(floorWidth, floorLength), 0x3b82f6, 0x1e293b);
    grid.position.set(floorWidth / 2, 0.01, floorLength / 2);
    scene.add(grid);

    // 6. Build Layout Objects
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);

    project.layoutObjects.forEach((obj) => {
      build3DObject(objectsGroup, obj);
    });

    // 7. Spaghetti Trajectory Group
    const spaghettiGroup = new THREE.Group();
    spaghettiGroupRef.current = spaghettiGroup;
    scene.add(spaghettiGroup);
    buildSpaghettiLines(spaghettiGroup, project.layoutObjects);

    // 8. Products Group for Simulation
    const productsGroup = new THREE.Group();
    productsGroupRef.current = productsGroup;
    scene.add(productsGroup);

    // Mouse Orbit Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 35, theta: 0.8, phi: 1.1 };
    const center = new THREE.Vector3(floorWidth / 2, 0, floorLength / 2);

    const updateCameraPos = () => {
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi));
      camera.position.x = center.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = center.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(center);
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.008;
      spherical.phi -= dy * 0.008;
      updateCameraPos();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      spherical.radius = Math.max(10, Math.min(80, spherical.radius + e.deltaY * 0.04));
      updateCameraPos();
    };

    const dom = mountRef.current;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel);

    // 9. Waypoints for Product Travel
    const waypointPositions: THREE.Vector3[] = [];
    project.layoutObjects
      .filter((o) => o.type.includes('Table') || o.type === 'MaterialIn' || o.type === 'FinishedGoods')
      .forEach((o) => {
        waypointPositions.push(new THREE.Vector3((o.xMm + o.widthMm / 2) / 1000, 0.9, (o.yMm + o.lengthMm / 2) / 1000));
      });

    // 10. Simulation Loop
    let lastTime = performance.now();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = ((now - lastTime) / 1000) * simStateRef.current.speed;
      lastTime = now;

      if (simStateRef.current.isRunning && waypointPositions.length > 1) {
        simStateRef.current.elapsed += dt;
        simStateRef.current.timer += dt;
        setElapsedTimeSec(simStateRef.current.elapsed);

        // Check if we need to spawn more products
        const canSpawn =
          simStateRef.current.isContinuous ||
          simStateRef.current.spawned < simStateRef.current.targetBatch;

        const spawnInterval = 3.0 / Math.max(1, simStateRef.current.speed * 0.8);
        if (simStateRef.current.timer >= spawnInterval && canSpawn) {
          simStateRef.current.timer = 0;
          simStateRef.current.spawned++;

          const boxGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
          const box = new THREE.Mesh(boxGeo, boxMat);
          box.castShadow = true;
          box.position.copy(waypointPositions[0]);
          productsGroup.add(box);

          activeProductsRef.current.push({
            mesh: box,
            currentWaypoint: 0,
            waitTimer: 0.35,
          });
        }

        // Update active product items along line
        for (let i = activeProductsRef.current.length - 1; i >= 0; i--) {
          const item = activeProductsRef.current[i];
          if (item.waitTimer > 0) {
            item.waitTimer -= dt;
          } else {
            if (item.currentWaypoint < waypointPositions.length - 1) {
              const target = waypointPositions[item.currentWaypoint + 1];
              item.mesh.position.lerp(target, 4.0 * dt);

              if (item.mesh.position.distanceTo(target) < 0.15) {
                item.currentWaypoint++;
                item.waitTimer = 0.5;
              }
            } else {
              // Item finished at exit
              productsGroup.remove(item.mesh);
              activeProductsRef.current.splice(i, 1);
              simStateRef.current.completed++;
              setCompletedCount(simStateRef.current.completed);

              // Auto-stop when batch goal is reached!
              if (
                !simStateRef.current.isContinuous &&
                simStateRef.current.completed >= simStateRef.current.targetBatch
              ) {
                simStateRef.current.isRunning = false;
                setIsSimRunning(false);
                setIsBatchFinished(true);
              }
            }
          }
        }

        setWipCount(activeProductsRef.current.length);
        if (simStateRef.current.elapsed > 0) {
          setThroughput(
            Math.round((simStateRef.current.completed / simStateRef.current.elapsed) * 3600)
          );
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [project]);

  useEffect(() => {
    if (spaghettiGroupRef.current) {
      spaghettiGroupRef.current.visible = showSpaghetti;
    }
  }, [showSpaghetti]);

  const handleStartSim = () => {
    setIsBatchFinished(false);
    setIsSimRunning(true);
  };

  const handlePauseSim = () => {
    setIsSimRunning(false);
  };

  const handleResetSim = () => {
    setIsSimRunning(false);
    setIsBatchFinished(false);
    simStateRef.current.spawned = 0;
    simStateRef.current.completed = 0;
    simStateRef.current.elapsed = 0;
    simStateRef.current.timer = 0;
    setCompletedCount(0);
    setWipCount(0);
    setThroughput(0);
    setElapsedTimeSec(0);

    if (productsGroupRef.current) {
      while (productsGroupRef.current.children.length > 0) {
        productsGroupRef.current.remove(productsGroupRef.current.children[0]);
      }
    }
    activeProductsRef.current = [];
  };

  // Format seconds to mm:ss.s
  const formatStopwatch = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(1);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(4, '0')}s`;
  };

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] bg-slate-950 overflow-hidden">
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none gap-4">
        {/* Left Controls: Start/Pause/Reset & Batch Target */}
        <div className="flex items-center space-x-3 pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-2xl">
          {/* Start / Pause Button */}
          {!isSimRunning ? (
            <button
              onClick={handleStartSim}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{completedCount > 0 ? 'Wznów' : 'Start Symulacji'}</span>
            </button>
          ) : (
            <button
              onClick={handlePauseSim}
              className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pauza</span>
            </button>
          )}

          {/* Reset Button */}
          <button
            onClick={handleResetSim}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Resetuj symulację i stoper"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Target Batch Size Input */}
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 font-medium">Cel Partii:</span>
            {!isContinuous ? (
              <input
                type="number"
                min="1"
                max="1000"
                value={targetBatch}
                onChange={(e) => setTargetBatch(Math.max(1, Number(e.target.value)))}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-center text-blue-400 focus:outline-none focus:border-blue-500"
                title="Wpisz liczbę sztuk do wyprodukowania"
              />
            ) : (
              <span className="text-xs font-bold text-indigo-400">Ciągła (∞)</span>
            )}

            {/* Continuous Mode Toggle */}
            <button
              onClick={() => setIsContinuous(!isContinuous)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                isContinuous
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isContinuous ? 'Ciągła' : 'Partia'}
            </button>
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  simSpeed === spd ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Spaghetti Toggle */}
          <button
            onClick={() => setShowSpaghetti(!showSpaghetti)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
              showSpaghetti
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>🍝 Spaghetti</span>
          </button>
        </div>

        {/* Right Live Metrics & Stopwatch Card */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-6 text-xs font-semibold">
          {/* Active Stopwatch */}
          <div className="border-r border-slate-800 pr-4">
            <span className="text-slate-500 block text-[10px] uppercase flex items-center space-x-1">
              <Timer className="w-3 h-3 text-blue-400" />
              <span>Stoper Partii</span>
            </span>
            <span className="text-blue-400 text-base font-mono font-bold">
              {formatStopwatch(elapsedTimeSec)}
            </span>
          </div>

          {/* Produced / Target */}
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Wyprodukowano</span>
            <span className="text-emerald-400 text-base font-bold">
              {completedCount} / {isContinuous ? '∞' : targetBatch} szt.
            </span>
          </div>

          {/* WIP */}
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">W toku (WIP)</span>
            <span className="text-indigo-400 text-base font-bold">{wipCount} szt.</span>
          </div>

          {/* Throughput */}
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Wydajność</span>
            <span className="text-amber-400 text-base font-bold">{throughput} szt./h</span>
          </div>
        </div>
      </div>

      {/* Batch Finished Notification Modal / Banner */}
      {isBatchFinished && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-emerald-500/50 p-6 rounded-3xl shadow-2xl text-center space-y-3 z-30 max-w-md animate-bounce-short">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            🎉 Partia {targetBatch} sztuk ukończona!
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Symulacja oraz stoper zostały automatycznie zatrzymane po zejściu {targetBatch} wyrobów gotowych.
          </p>

          <div className="bg-slate-800/80 p-3 rounded-xl grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">Czas partii:</span>
              <span className="text-blue-400 font-bold">{formatStopwatch(elapsedTimeSec)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Średnie tempo:</span>
              <span className="text-emerald-400 font-bold">{throughput} szt./h</span>
            </div>
          </div>

          <button
            onClick={handleResetSim}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20"
          >
            Rozpocznij Nową Partię
          </button>
        </div>
      )}

      {/* Bottom Controls Hint */}
      <div className="absolute bottom-4 left-6 text-xs text-slate-400 pointer-events-none bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-slate-800">
        🖱️ <strong>Sterowanie 3D:</strong> Lewy przycisk = Obrót • Kółko = Zoom • Prawy przycisk = Przesuwanie
      </div>
    </div>
  );
};

// Helper 3D Mesh Builders
function build3DObject(parent: THREE.Group, obj: LayoutObject) {
  const x = (obj.xMm + obj.widthMm / 2) / 1000;
  const z = (obj.yMm + obj.lengthMm / 2) / 1000;
  const w = obj.widthMm / 1000;
  const l = obj.lengthMm / 1000;
  const h = obj.heightMm / 1000;

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = (obj.rotationDeg * Math.PI) / 180;

  if (obj.type === 'TableESD' || obj.type === 'Table') {
    const topGeo = new THREE.BoxGeometry(w, 0.06, l);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.4 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = h;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(0.08, h, 0.08);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set((sx * (w - 0.16)) / 2, h / 2, (sz * (l - 0.16)) / 2);
      leg.castShadow = true;
      group.add(leg);
    });

    const postGeo = new THREE.BoxGeometry(0.06, 1.2, 0.06);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    [-1, 1].forEach((sx) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set((sx * (w - 0.2)) / 2, h + 0.6, -l / 2 + 0.05);
      group.add(post);
    });

    const railGeo = new THREE.BoxGeometry(w - 0.1, 0.05, 0.05);
    const rail = new THREE.Mesh(railGeo, postMat);
    rail.position.set(0, h + 1.15, -l / 2 + 0.05);
    group.add(rail);

  } else if (obj.type.includes('FIFO')) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.4, roughness: 0.4 });
    const legGeo = new THREE.BoxGeometry(0.06, h, 0.06);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(legGeo, frameMat);
      leg.position.set((sx * (w - 0.1)) / 2, h / 2, (sz * (l - 0.1)) / 2);
      group.add(leg);
    });

    [0.4, 0.8, 1.2].forEach((shelfY, idx) => {
      const shelfGeo = new THREE.BoxGeometry(w - 0.05, 0.03, l - 0.05);
      const shelfMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, shelfY, 0);
      shelf.rotation.x = 0.08;
      group.add(shelf);

      const kltGeo = new THREE.BoxGeometry(0.35, 0.2, 0.45);
      const kltMat = new THREE.MeshStandardMaterial({ color: idx === 0 ? 0x2563eb : idx === 1 ? 0xd97706 : 0xdc2626 });
      [-0.4, 0, 0.4].forEach((kx) => {
        const klt = new THREE.Mesh(kltGeo, kltMat);
        klt.position.set(kx, shelfY + 0.12, 0);
        klt.rotation.x = 0.08;
        group.add(klt);
      });
    });

  } else if (obj.type.includes('Conveyor')) {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const rSideGeo = new THREE.BoxGeometry(w, 0.1, 0.05);
    [-1, 1].forEach((sz) => {
      const side = new THREE.Mesh(rSideGeo, railMat);
      side.position.set(0, 0.75, (sz * (l - 0.05)) / 2);
      group.add(side);
    });

    const rollerGeo = new THREE.CylinderGeometry(0.04, 0.04, l - 0.1, 12);
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    for (let rx = -w / 2 + 0.1; rx <= w / 2 - 0.1; rx += 0.15) {
      const roller = new THREE.Mesh(rollerGeo, rollerMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(rx, 0.75, 0);
      group.add(roller);
    }

  } else if (obj.type === 'OperatorErgoMat') {
    const matGeo = new THREE.BoxGeometry(w, 0.02, l);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.9 });
    const mat = new THREE.Mesh(matGeo, matMat);
    mat.position.y = 0.01;
    group.add(mat);

  } else {
    const boxGeo = new THREE.BoxGeometry(w, h || 0.05, l);
    const boxMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(obj.colorHex || '#3b82f6'), opacity: 0.9, transparent: true });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = (h || 0.05) / 2;
    group.add(box);
  }

  parent.add(group);
}

function buildSpaghettiLines(parent: THREE.Group, objects: LayoutObject[]) {
  const points: THREE.Vector3[] = [];
  objects
    .filter((o) => o.type.includes('Table') || o.type === 'MaterialIn' || o.type === 'FinishedGoods')
    .forEach((o) => {
      points.push(new THREE.Vector3((o.xMm + o.widthMm / 2) / 1000, 0.05, (o.yMm + o.lengthMm / 2) / 1000));
    });

  if (points.length < 2) return;

  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  parent.add(tube);

  const nodeGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const nodeMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.8 });
  points.forEach((pt) => {
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(pt);
    parent.add(node);
  });
}
