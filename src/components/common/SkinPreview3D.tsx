import { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { PCKAsset, PCKAssetType } from '../../types/pck';

interface SkinPreview3DProps {
  asset: PCKAsset;
  previewUrl?: string;
  className?: string;
}

enum SKIN_ANIM {
  STATIONARY_ARMS = 1 << 0,
  ZOMBIE_ARMS = 1 << 1,
  STATIONARY_LEGS = 1 << 2,
  BAD_SANTA_IDLE = 1 << 3,
  UNKNOWN_EFFECT = 1 << 4,
  SYNCHRONIZED_LEGS = 1 << 5,
  SYNCHRONIZED_ARMS = 1 << 6,
  STATUE_OF_LIBERTY = 1 << 7,
  HIDE_ARMOR = 1 << 8,
  FIRST_PERSON_BOBBING_DISABLED = 1 << 9,
  HIDE_HEAD = 1 << 10,
  HIDE_RIGHT_ARM = 1 << 11,
  HIDE_LEFT_ARM = 1 << 12,
  HIDE_BODY = 1 << 13,
  HIDE_RIGHT_LEG = 1 << 14,
  HIDE_LEFT_LEG = 1 << 15,
  HIDE_HAT = 1 << 16,
  BACKWARDS_CROUCH = 1 << 17,
  MODERN_WIDE_FORMAT = 1 << 18,
  SLIM_FORMAT = 1 << 19,
  HIDE_LEFT_SLEEVE = 1 << 20,
  HIDE_RIGHT_SLEEVE = 1 << 21,
  HIDE_LEFT_PANT = 1 << 22,
  HIDE_RIGHT_PANT = 1 << 23,
  HIDE_JACKET = 1 << 24,
  ALLOW_HEAD_ARMOR = 1 << 25,
  ALLOW_RIGHT_ARM_ARMOR = 1 << 26,
  ALLOW_LEFT_ARM_ARMOR = 1 << 27,
  ALLOW_CHESTPLATE = 1 << 28,
  ALLOW_RIGHT_LEGGING = 1 << 29,
  ALLOW_LEFT_LEGGING = 1 << 30,
  DINNER_BONE_RENDERING = 1 << 31
}

const SkinPreview3D = memo(function SkinPreview3D({ asset, previewUrl, className }: SkinPreview3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 50);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(10, 20, 10);
    scene.add(dl);
    const playerGroup = new THREE.Group();
    playerGroup.position.y = 4;
    scene.add(playerGroup);
    playerGroupRef.current = playerGroup;
    const render = () => {
      renderer.render(scene, camera);
    };

    const isFallbackUrl = !previewUrl;
    const url = previewUrl || URL.createObjectURL(new Blob([asset.data as any], { type: 'image/png' }));
    const textureLoader = new THREE.TextureLoader();
    let active = true;
    textureLoader.load(url, (texture) => {
      if (!active) return;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      const img = texture.image;
      const isLegacy = img.height === 32;
      const animProp = asset.properties.find(p => p.key === "ANIM");
      const animValue = animProp ? parseInt(animProp.value) || 0 : 0;
      const slimFormat = !!(animValue & SKIN_ANIM.SLIM_FORMAT);
      const texW = img.width || 64;
      const texH = img.height || 32;
      const createFaceMaterial = (x: number, y: number, w: number, h: number, flipX = false, flipY = false) => {
        const matTex = texture.clone();
        matTex.repeat.set((flipX ? -w : w) / texW, (flipY ? -h : h) / texH);
        matTex.offset.set((flipX ? (x + w) : x) / texW, 1 - (flipY ? y : (y + h)) / texH);
        matTex.needsUpdate = true;
        return new THREE.MeshLambertMaterial({ map: matTex, transparent: true, alphaTest: 0.5, side: THREE.FrontSide });
      };

      const createPart = (w: number, h: number, d: number, uv: any, overlayUv?: any, isMirror = false) => {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(w, h, d);
        const getMats = (uvSet: any) => {
          return [
            createFaceMaterial(uvSet.right[0], uvSet.right[1], uvSet.right[2], uvSet.right[3], isMirror), // +x
            createFaceMaterial(uvSet.left[0], uvSet.left[1], uvSet.left[2], uvSet.left[3], isMirror),   // -x
            createFaceMaterial(uvSet.top[0], uvSet.top[1], uvSet.top[2], uvSet.top[3], isMirror, true),    // +y
            createFaceMaterial(uvSet.bottom[0], uvSet.bottom[1], uvSet.bottom[2], uvSet.bottom[3], isMirror, true), // -y
            createFaceMaterial(uvSet.front[0], uvSet.front[1], uvSet.front[2], uvSet.front[3], isMirror), // +z
            createFaceMaterial(uvSet.back[0], uvSet.back[1], uvSet.back[2], uvSet.back[3], !isMirror)    // -z
          ];
        };

        const mesh = new THREE.Mesh(geo, getMats(uv));
        group.add(mesh);
        if (overlayUv) {
          const oGeo = new THREE.BoxGeometry(w + 0.5, h + 0.5, d + 0.5);
          const oMesh = new THREE.Mesh(oGeo, getMats(overlayUv));
          group.add(oMesh);
        }
        return group;
      };

      const limbUv = (x: number, y: number, w = 4) => ({
        top: [x + 4, y, w, 4], bottom: [x + 4 + w, y, w, 4],
        right: [x, y + 4, 4, 12], front: [x + 4, y + 4, w, 12],
        left: [x + 4 + w, y + 4, 4, 12], back: [x + 8 + w, y + 4, w, 12]
      });

      if (asset.type === PCKAssetType.CAPE) {
        const capeUv = {
          top: [1, 0, 10, 1], bottom: [11, 0, 10, 1],
          right: [0, 1, 1, 16], front: [1, 1, 10, 16],
          left: [11, 1, 1, 16], back: [12, 1, 10, 16]
        };
        const cape = createPart(10, 16, 1, capeUv);
        cape.position.y = 2;
        playerGroup.add(cape);
      } else {
        const armW = slimFormat ? 3 : 4;

        if (!(animValue & SKIN_ANIM.HIDE_HEAD)) {
          const headUv = { top: [8, 0, 8, 8], bottom: [16, 0, 8, 8], right: [0, 8, 8, 8], left: [16, 8, 8, 8], front: [8, 8, 8, 8], back: [24, 8, 8, 8] };
          const hatUv = (animValue & SKIN_ANIM.HIDE_HAT) ? undefined : { top: [40, 0, 8, 8], bottom: [48, 0, 8, 8], right: [32, 8, 8, 8], left: [48, 8, 8, 8], front: [40, 8, 8, 8], back: [56, 8, 8, 8] };
          const head = createPart(8, 8, 8, headUv, hatUv);
          head.position.y = 10;
          playerGroup.add(head);
        }

        if (!(animValue & SKIN_ANIM.HIDE_BODY)) {
          const bodyUv = { top: [20, 16, 8, 4], bottom: [28, 16, 8, 4], right: [16, 20, 4, 12], left: [28, 20, 4, 12], front: [20, 20, 8, 12], back: [32, 20, 8, 12] };
          const jacketUv = (isLegacy || (animValue & SKIN_ANIM.HIDE_JACKET)) ? undefined : { top: [20, 32, 8, 4], bottom: [28, 32, 8, 4], right: [16, 36, 4, 12], left: [28, 36, 4, 12], front: [20, 36, 8, 12], back: [32, 36, 8, 12] };
          playerGroup.add(createPart(8, 12, 4, bodyUv, jacketUv));
        }

        if (!(animValue & SKIN_ANIM.HIDE_RIGHT_ARM)) {
          const rArmUv = limbUv(40, 16, armW);
          const rSleeveUv = (isLegacy || (animValue & SKIN_ANIM.HIDE_RIGHT_SLEEVE)) ? undefined : limbUv(40, 32, armW);
          const rightArm = createPart(armW, 12, 4, rArmUv, rSleeveUv);
          rightArm.position.set(slimFormat ? -5.5 : -6, 0, 0);
          playerGroup.add(rightArm);
        }

        if (!(animValue & SKIN_ANIM.HIDE_LEFT_ARM)) {
          const lArmUv = isLegacy ? limbUv(40, 16, armW) : limbUv(32, 48, armW);
          const lSleeveUv = (isLegacy || (animValue & SKIN_ANIM.HIDE_LEFT_SLEEVE)) ? undefined : limbUv(48, 48, armW);
          const leftArm = createPart(armW, 12, 4, lArmUv, lSleeveUv, isLegacy);
          leftArm.position.set(slimFormat ? 5.5 : 6, 0, 0);
          playerGroup.add(leftArm);
        }

        if (!(animValue & SKIN_ANIM.HIDE_RIGHT_LEG)) {
          const rLegUv = limbUv(0, 16);
          const rPantUv = (isLegacy || (animValue & SKIN_ANIM.HIDE_RIGHT_PANT)) ? undefined : limbUv(0, 32);
          const rightLeg = createPart(4, 12, 4, rLegUv, rPantUv);
          rightLeg.position.set(-2, -12, 0);
          playerGroup.add(rightLeg);
        }

        if (!(animValue & SKIN_ANIM.HIDE_LEFT_LEG)) {
          const lLegUv = isLegacy ? limbUv(0, 16) : limbUv(16, 48);
          const lPantUv = (isLegacy || (animValue & SKIN_ANIM.HIDE_LEFT_PANT)) ? undefined : limbUv(0, 48);
          const leftLeg = createPart(4, 12, 4, lLegUv, lPantUv, isLegacy);
          leftLeg.position.set(2, -12, 0);
          playerGroup.add(leftLeg);
        }
      }

      const boxProps = asset.properties.filter(p => p.key === "BOX");
      boxProps.forEach(prop => {
        const parts = prop.value.split(/\s+/);
        if (parts.length >= 11) {
          const type = parts[0];
          const bx = parseFloat(parts[1]);
          const by = parseFloat(parts[2]);
          const bz = parseFloat(parts[3]);
          const bw = parseFloat(parts[4]);
          const bh = parseFloat(parts[5]);
          const bd = parseFloat(parts[6]);
          const bu = parseFloat(parts[7]);
          const bv = parseFloat(parts[8]);
          const mir = parseInt(parts[10]) === 1;
          const scale = parseFloat(parts[11] || "0");

          const uv = {
            top: [bu + bd, bv, bw, bd],
            bottom: [bu + bd + bw, bv, bw, bd],
            right: [bu, bv + bd, bd, bh],
            front: [bu + bd, bv + bd, bw, bh],
            left: [bu + bd + bw, bv + bd, bd, bh],
            back: [bu + 2 * bd + bw, bv + bd, bw, bh]
          };

          const boxPart = createPart(bw, bh, bd, uv, undefined, mir);

          let ox = 0, oy = 0, oz = 0;
          if (type === "HEAD_DEFAULT") oy = -4;
          else if (type === "HEAD") oy = -8;
          else if (type === "BODY") oy = 2;
          else if (type === "ARM0") { ox = -5; oy = 2; }
          else if (type === "ARM1") { ox = 5; oy = 2; }
          else if (type === "LEG0") { ox = -1.9; oy = 12; }
          else if (type === "LEG1") { ox = 1.9; oy = 12; }

          boxPart.position.set(ox + bx + bw / 2, -(oy + by) - bh / 2, oz + bz + bd / 2);
          if (scale !== 0) boxPart.scale.set(1 + scale / bw, 1 + scale / bh, 1 + scale / bd);
          playerGroup.add(boxPart);
        }
      });

      playerGroup.rotation.y = -0.3;
      render();
    }, undefined, (err) => {
      console.error("Failed to load skin texture", err);
    });

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && playerGroupRef.current) {
        playerGroupRef.current.rotation.y += (e.clientX - previousMousePosition.x) * 0.01;
        playerGroupRef.current.rotation.x += (e.clientY - previousMousePosition.y) * 0.01;
        previousMousePosition = { x: e.clientX, y: e.clientY };
        render();
      }
    };

    const onWheel = (e: WheelEvent) => {
      camera.position.z += e.deltaY * 0.1;
      camera.position.z = Math.max(20, Math.min(camera.position.z, 200));
      render();
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel);

    const handleResize = () => {
      if (!mountRef.current || !renderer) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      render();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      active = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", handleResize);
      if (isFallbackUrl) URL.revokeObjectURL(url);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => {
                if (mat.map) mat.map.dispose();
                mat.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
        }
      });
      renderer.dispose();
    };
  }, [asset, previewUrl]);

  return <div ref={mountRef} className={`w-full h-full cursor-move ${className}`} />;
});

export default SkinPreview3D;
