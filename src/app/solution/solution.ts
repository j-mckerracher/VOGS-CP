import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { RevealDirective } from '../directives/reveal.directive';

@Component({
  selector: 'app-solution',
  imports: [RevealDirective],
  templateUrl: './solution.html',
  styleUrl: './solution.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolutionComponent implements OnDestroy {
  readonly threeCanvas = viewChild<ElementRef<HTMLCanvasElement>>('threeCanvas');
  readonly mode = signal<'gaussian' | 'voxel'>('gaussian');
  readonly webglFailed = signal(false);

  readonly infoShapes = signal('~50');
  readonly infoComm = signal('Smart');
  readonly infoAlign = signal('Instant');
  readonly infoDepth = signal('No');
  readonly legendOpacity = signal(1);

  private renderer: THREE.WebGLRenderer | null = null;
  private gaussGroup: THREE.Group | null = null;
  private voxelGroup: THREE.Group | null = null;
  private animId = 0;
  private rotY = 0;
  private mouseDown = false;
  private lastMouseX = 0;
  private vCount = 0;
  private resizeHandler: (() => void) | null = null;
  private containerResizeObserver: ResizeObserver | null = null;
  private mouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private mouseUpHandler: (() => void) | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {
    afterNextRender(() => {
      const canvas = this.threeCanvas()?.nativeElement;
      console.log('[VOGS-CP] afterNextRender: canvas =', canvas,
        'parentWidth =', canvas?.parentElement?.offsetWidth);
      if (!canvas) {
        console.warn('[VOGS-CP] Canvas element not found, skipping Three.js init');
        return;
      }
      const parentWidth = canvas.parentElement?.offsetWidth ?? 0;
      if (parentWidth > 0) {
        this.initThree(canvas);
      } else {
        // Container has no width yet — wait for ResizeObserver to fire
        console.warn('[VOGS-CP] Container width is 0, deferring Three.js init to ResizeObserver');
        if (canvas.parentElement && typeof ResizeObserver !== 'undefined') {
          const initObserver = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? 0;
            if (width > 0) {
              initObserver.disconnect();
              console.log('[VOGS-CP] ResizeObserver triggered init, width =', width);
              this.initThree(canvas);
            }
          });
          initObserver.observe(canvas.parentElement);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    if (this.mouseUpHandler) window.removeEventListener('mouseup', this.mouseUpHandler);
    this.containerResizeObserver?.disconnect();
    this.renderer?.dispose();
  }

  switchMode(mode: 'gaussian' | 'voxel'): void {
    this.mode.set(mode);
    if (this.gaussGroup) this.gaussGroup.visible = mode === 'gaussian';
    if (this.voxelGroup) this.voxelGroup.visible = mode === 'voxel';

    if (mode === 'gaussian') {
      this.infoShapes.set('~50');
      this.infoComm.set('Smart');
      this.infoAlign.set('Instant');
      this.infoDepth.set('No');
      this.legendOpacity.set(1);
    } else {
      this.infoShapes.set(`~${this.vCount}`);
      this.infoComm.set('Uniform');
      this.infoAlign.set('Complex');
      this.infoDepth.set('Often');
      this.legendOpacity.set(0.3);
    }
  }

  private initThree(canvas: HTMLCanvasElement): void {
    console.log('[VOGS-CP] initThree: parentWidth =', canvas.parentElement?.offsetWidth,
      'parentHeight =', canvas.parentElement?.offsetHeight,
      'WebGL supported =', typeof WebGLRenderingContext !== 'undefined');

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      console.error('[VOGS-CP] THREE.WebGLRenderer creation failed:', e);
      this.webglFailed.set(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x141414, 1);
    renderer.shadowMap.enabled = false;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x141414, 0.04);

    const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
    camera.position.set(0, 14, 18);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xCFB991, 1.2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0x3377ff, 0.4);
    dirLight2.position.set(-5, 5, -5);
    scene.add(dirLight2);

    // Gaussian group
    const gaussGroup = new THREE.Group();
    scene.add(gaussGroup);
    this.gaussGroup = gaussGroup;

    const COLORS = {
      road: 0x5A5A5A, sidewalk: 0xC8B89A, building: 0x8B6B3E,
      car: 0xE67E22, car2: 0xD35400, car3: 0xE74C3C,
      vegetation: 0x27AE60, pole: 0x95A5A6,
    };

    const makeGaussian = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, emissive: number = 0x000000) => {
      const geo = new THREE.SphereGeometry(1, 10, 7);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive, emissiveIntensity: 0.2,
        roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.88,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x, y, z);
      mesh.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
      gaussGroup.add(mesh);
      return mesh;
    };

    // Road
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        if (Math.abs(i) < 2 || Math.abs(j) < 2) {
          makeGaussian(i * 2.2, -0.5, j * 2.2, 1.8, 0.15, 1.8, COLORS.road, 0x222222);
        }
      }
    }

    // Sidewalks
    for (let i = -3; i <= 3; i++) {
      makeGaussian(i * 1.5 - 6, -0.4, 0, 1.2, 0.12, 1.0, COLORS.sidewalk, 0x332820);
      makeGaussian(i * 1.5 + 6, -0.4, 0, 1.2, 0.12, 1.0, COLORS.sidewalk, 0x332820);
    }

    // Buildings
    const buildingPositions: [number, number, number][] = [[-7, 1.5, -7], [7, 2, -7], [-7, 1, 7], [7, 1.5, 7]];
    buildingPositions.forEach(([x, y, z]) => {
      makeGaussian(x, y, z, 2.5, 1.8 + Math.random(), 2.5, COLORS.building, 0x110800);
      makeGaussian(x + 0.5, y + 2, z - 0.5, 2.0, 1.2, 2.0, COLORS.building, 0x110800);
    });

    // Vehicles
    makeGaussian(0, 0.4, 2, 0.9, 0.5, 1.8, 0xCFB991, 0x2A2000);
    makeGaussian(0, 0.9, 2, 0.7, 0.3, 1.0, 0xE8D5A3, 0x3A3000);
    makeGaussian(-3, 0.4, -2, 0.9, 0.5, 1.8, COLORS.car, 0x1A0A00);
    makeGaussian(-3, 0.9, -2, 0.7, 0.3, 1.0, 0xFFA040, 0x1A0800);
    makeGaussian(3, 0.4, -1, 0.9, 0.5, 1.8, COLORS.car2, 0x1A0500);
    makeGaussian(3, 0.9, -1, 0.7, 0.3, 1.0, 0xF08040, 0x180500);
    makeGaussian(-5, 0.4, -5, 0.9, 0.5, 1.8, COLORS.car3, 0x1A0000);
    makeGaussian(-5, 0.9, -5, 0.65, 0.3, 0.9, 0xFF6060, 0x180000);

    // Vegetation
    const treePositions: [number, number, number][] = [[-5, 0.8, 5], [5, 1.0, 5], [-6, 0.7, 2], [6, 0.9, -2], [4, 0.8, 6], [-4, 0.8, -6]];
    treePositions.forEach(([x, y, z]) => {
      makeGaussian(x, y, z, 0.8 + Math.random() * 0.4, 1.2 + Math.random() * 0.5, 0.8 + Math.random() * 0.4, COLORS.vegetation, 0x001A00);
    });

    // Poles
    ([[-2, 0.8, -4], [2, 0.8, -4], [2, 0.8, 4]] as [number, number, number][]).forEach(([x, y, z]) => {
      makeGaussian(x, y, z, 0.1, 1.5, 0.1, COLORS.pole, 0x111111);
    });

    // Voxel group
    const voxelGroup = new THREE.Group();
    voxelGroup.visible = false;
    scene.add(voxelGroup);
    this.voxelGroup = voxelGroup;

    const voxGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const voxMats = [
      new THREE.MeshStandardMaterial({ color: 0x3A5A7A, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x4A6A8A, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x2A4A6A, roughness: 0.9 }),
    ];

    const GRID = 10;
    let vCount = 0;
    for (let x = -GRID / 2; x < GRID / 2; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = -GRID / 2; z < GRID / 2; z++) {
          if (Math.random() > 0.35) {
            const m = new THREE.Mesh(voxGeo, voxMats[Math.floor(Math.random() * 3)]);
            m.position.set(x * 1.4, y * 0.9, z * 1.4);
            voxelGroup.add(m);
            vCount++;
          }
        }
      }
    }
    this.vCount = vCount;

    // Resize
    const resize = () => {
      const w = canvas.parentElement?.offsetWidth || 900;
      const h = w * (9 / 16);
      console.log('[VOGS-CP] resize: w =', w, 'h =', h);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);

    // ResizeObserver for reliable sizing when container changes dimensions
    if (canvas.parentElement && typeof ResizeObserver !== 'undefined') {
      this.containerResizeObserver = new ResizeObserver(() => resize());
      this.containerResizeObserver.observe(canvas.parentElement);
    }

    resize();

    // Mouse interaction
    this.mouseDownHandler = (e: MouseEvent) => { this.mouseDown = true; this.lastMouseX = e.clientX; };
    this.mouseUpHandler = () => { this.mouseDown = false; };
    this.mouseMoveHandler = (e: MouseEvent) => {
      if (!this.mouseDown) return;
      this.rotY += (e.clientX - this.lastMouseX) * 0.008;
      this.lastMouseX = e.clientX;
    };
    canvas.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    canvas.addEventListener('mousemove', this.mouseMoveHandler);

    // Animation loop
    const animate = () => {
      this.animId = requestAnimationFrame(animate);
      if (!this.mouseDown) this.rotY += 0.003;
      gaussGroup.rotation.y = this.rotY;
      voxelGroup.rotation.y = this.rotY;

      gaussGroup.children.forEach((m, i) => {
        m.position.y += Math.sin(Date.now() * 0.001 + i * 0.5) * 0.0006;
      });

      renderer.render(scene, camera);
    };
    animate();
  }
}
