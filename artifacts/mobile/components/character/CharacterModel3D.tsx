import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import type { BodyType, OutfitTier, PostureStage } from "@/lib/characterEngine";

const SKIN_TONES: Record<string, string> = {
  "tone-1": "#F5D5B8",
  "tone-2": "#E8B48A",
  "tone-3": "#C68A5E",
  "tone-4": "#8D5524",
  "tone-5": "#4A2C0A",
};

const HAIR_COLORS: Record<string, string> = {
  "black": "#1A1A1A",
  "dark-brown": "#2C1A0E",
  "medium-brown": "#5C3A1E",
  "light-brown": "#8B5E3C",
  "dirty-blonde": "#BF9B5A",
  "blonde": "#E8D090",
  "auburn": "#7B3F20",
  "platinum": "#DCDCDC",
};

const OUTFIT_COLORS: Record<OutfitTier, { shirt: string; pants: string; shoe: string }> = {
  starter: { shirt: "#F0EDE8", pants: "#1C2842", shoe: "#B8B0A4" },
  rising: { shirt: "#EAEAEE", pants: "#101828", shoe: "#F0F0F0" },
  premium: { shirt: "#E8E4E0", pants: "#1A1A24", shoe: "#3A3028" },
  elite: { shirt: "#1C1C28", pants: "#0A0A12", shoe: "#1A1612" },
};

const POSTURE_TRANSFORMS: Record<PostureStage, {
  shoulderBack: number; chestTilt: number; stanceW: number; armFlare: number; headLift: number;
}> = {
  neutral: { shoulderBack: 0, chestTilt: 0, stanceW: 0.8, armFlare: 0, headLift: 0 },
  upright: { shoulderBack: -0.08, chestTilt: 0.03, stanceW: 0.9, armFlare: 0, headLift: 0 },
  athletic: { shoulderBack: -0.14, chestTilt: 0.07, stanceW: 1.0, armFlare: 0.05, headLift: 0 },
  peak: { shoulderBack: -0.2, chestTilt: 0.1, stanceW: 1.1, armFlare: 0.1, headLift: 0.03 },
};

function makeToon(color: string) {
  const c = new THREE.Color(color);
  const gradientMap = new THREE.DataTexture(
    new Uint8Array([80, 160, 220, 255]),
    4, 1, THREE.RedFormat
  );
  gradientMap.needsUpdate = true;
  return new THREE.MeshToonMaterial({ color: c, gradientMap });
}

function Limb({ position, args, color, rotation }: {
  position: [number, number, number];
  args: [number, number, number, number?];
  color: string;
  rotation?: [number, number, number];
}) {
  const mat = useMemo(() => makeToon(color), [color]);
  return (
    <mesh position={position} rotation={rotation} material={mat}>
      <cylinderGeometry args={args} />
    </mesh>
  );
}

interface Props {
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  bodyType: BodyType;
  outfitTier: OutfitTier;
  postureStage: PostureStage;
}

function HairGeometry({ style, mat }: { style: string; mat: THREE.MeshToonMaterial }) {
  switch (style) {
    case "buzz_cut":
      return (
        <mesh position={[0, 0.15, 0]} material={mat}>
          <sphereGeometry args={[0.57, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        </mesh>
      );
    case "crew_cut":
      return (
        <>
          <mesh position={[0, 0.18, 0]} material={mat}>
            <sphereGeometry args={[0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          </mesh>
          <mesh position={[0, 0.35, 0.1]} material={mat}>
            <boxGeometry args={[0.4, 0.12, 0.3]} />
          </mesh>
        </>
      );
    case "textured_crop":
    case "french_crop":
      return (
        <>
          <mesh position={[0, 0.2, 0]} material={mat}>
            <sphereGeometry args={[0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>
          <mesh position={[0, 0.32, 0.25]} material={mat}>
            <boxGeometry args={[0.5, 0.15, 0.25]} />
          </mesh>
        </>
      );
    case "side_part":
    case "classic_side_part":
      return (
        <>
          <mesh position={[0, 0.22, 0]} material={mat}>
            <sphereGeometry args={[0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>
          <mesh position={[-0.15, 0.38, 0.05]} material={mat} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.6, 0.12, 0.45]} />
          </mesh>
        </>
      );
    case "pompadour":
      return (
        <>
          <mesh position={[0, 0.22, 0]} material={mat}>
            <sphereGeometry args={[0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>
          <mesh position={[0, 0.48, 0.15]} material={mat}>
            <sphereGeometry args={[0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          </mesh>
        </>
      );
    case "slick_back":
    case "undercut":
      return (
        <>
          <mesh position={[0, 0.2, -0.05]} material={mat}>
            <sphereGeometry args={[0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>
          <mesh position={[0, -0.1, -0.35]} material={mat}>
            <boxGeometry args={[0.45, 0.4, 0.15]} />
          </mesh>
        </>
      );
    case "medium_waves":
    case "flow":
      return (
        <>
          <mesh position={[0, 0.22, 0]} material={mat}>
            <sphereGeometry args={[0.62, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          </mesh>
          <mesh position={[0, -0.15, -0.25]} material={mat}>
            <sphereGeometry args={[0.4, 16, 12]} />
          </mesh>
          <mesh position={[-0.4, -0.1, 0]} material={mat}>
            <sphereGeometry args={[0.2, 10, 8]} />
          </mesh>
          <mesh position={[0.4, -0.1, 0]} material={mat}>
            <sphereGeometry args={[0.2, 10, 8]} />
          </mesh>
        </>
      );
    case "man_bun":
      return (
        <>
          <mesh position={[0, 0.15, 0]} material={mat}>
            <sphereGeometry args={[0.57, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          </mesh>
          <mesh position={[0, 0.5, -0.2]} material={mat}>
            <sphereGeometry args={[0.18, 12, 12]} />
          </mesh>
        </>
      );
    case "clean_cut":
    default:
      return (
        <mesh position={[0, 0.22, 0]} material={mat}>
          <sphereGeometry args={[0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>
      );
  }
}

export function CharacterModel3D({
  skinTone,
  hairColor,
  hairStyle,
  bodyType,
  outfitTier,
  postureStage,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const skin = SKIN_TONES[skinTone] ?? SKIN_TONES["tone-3"];
  const hair = HAIR_COLORS[hairColor] ?? HAIR_COLORS["black"];
  const outfit = OUTFIT_COLORS[outfitTier];
  const posture = POSTURE_TRANSFORMS[postureStage];
  const isMale = bodyType === "male";

  const skinMat = useMemo(() => makeToon(skin), [skin]);
  const hairMat = useMemo(() => makeToon(hair), [hair]);
  const shirtMat = useMemo(() => makeToon(outfit.shirt), [outfit.shirt]);
  const pantsMat = useMemo(() => makeToon(outfit.pants), [outfit.pants]);
  const shoeMat = useMemo(() => makeToon(outfit.shoe), [outfit.shoe]);
  const soleMat = useMemo(() => makeToon("#E8E4DC"), []);
  const chainMat = useMemo(() => makeToon("#8A8A90"), []);
  const tagMat = useMemo(() => makeToon("#A8A8B0"), []);
  const braceletMat = useMemo(() => makeToon("#6B4226"), []);

  const shoulderW = isMale ? 1.4 : 1.15;
  const chestW = isMale ? 1.2 : 0.95;
  const chestD = isMale ? 0.7 : 0.6;
  const waistW = isMale ? 0.95 : 0.8;
  const hipW = isMale ? 0.9 : 1.0;
  const armR = isMale ? 0.16 : 0.13;
  const legR = isMale ? 0.2 : 0.18;
  const armLen = 2.0;
  const legLen = 2.4;

  const armXL = -(shoulderW / 2 + armR + 0.05 + posture.armFlare);
  const armXR = shoulderW / 2 + armR + 0.05 + posture.armFlare;
  const legXL = -(posture.stanceW * 0.3);
  const legXR = posture.stanceW * 0.3;

  return (
    <group ref={groupRef} rotation={[posture.chestTilt, 0, 0]}>
      <group position={[0, 7.6 + posture.headLift, 0]}>
        <mesh material={skinMat}>
          <sphereGeometry args={[0.55, 24, 20]} />
        </mesh>
        <HairGeometry style={hairStyle} mat={hairMat} />
        <mesh position={[-0.52, -0.05, 0]} material={skinMat}>
          <sphereGeometry args={[0.1, 8, 8]} />
        </mesh>
        <mesh position={[0.52, -0.05, 0]} material={skinMat}>
          <sphereGeometry args={[0.1, 8, 8]} />
        </mesh>
        <mesh position={[0, -0.15, 0.45]} material={skinMat}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
        <mesh position={[-0.22, 0.0, 0.42]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#1A1018" />
        </mesh>
        <mesh position={[0.22, 0.0, 0.42]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#1A1018" />
        </mesh>
        <mesh position={[-0.24, 0.02, 0.44]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.2, 0.02, 0.44]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      <Limb position={[0, 6.9, 0]} args={[0.22, 0.18, 0.5, 8]} color={skin} />

      <group position={[0, 5.8, 0]} rotation={[posture.shoulderBack, 0, 0]}>
        <mesh material={shirtMat}>
          <boxGeometry args={[chestW, 1.6, chestD]} />
        </mesh>
        <mesh position={[0, -0.1, 0]} material={shirtMat}>
          <boxGeometry args={[waistW, 1.4, chestD * 0.9]} />
        </mesh>
        <mesh position={[-shoulderW / 2, 0.65, 0]} material={shirtMat}>
          <sphereGeometry args={[0.25, 12, 12]} />
        </mesh>
        <mesh position={[shoulderW / 2, 0.65, 0]} material={shirtMat}>
          <sphereGeometry args={[0.25, 12, 12]} />
        </mesh>
        <mesh position={[0, 0.85, chestD / 2 - 0.02]} material={shirtMat}>
          <torusGeometry args={[0.2, 0.04, 8, 16, Math.PI]} />
        </mesh>
      </group>

      <group>
        <mesh position={[0, 0.4, chainMat ? 0.3 : 0]} material={chainMat}>
          <torusGeometry args={[0.04, 0.012, 6, 12]} />
        </mesh>
        <group position={[0, 5.5, chestD / 2 + 0.02]}>
          <mesh material={chainMat}>
            <torusGeometry args={[0.4, 0.015, 8, 24, Math.PI]} />
          </mesh>
          <mesh position={[0, -0.38, 0]} material={tagMat}>
            <boxGeometry args={[0.12, 0.2, 0.02]} />
          </mesh>
        </group>
      </group>

      <group position={[armXL, 6.2, 0]}>
        <Limb position={[0, -armLen / 2, 0]} args={[armR, armR * 0.9, armLen, 8]} color={outfit.shirt} />
        <Limb position={[0, -armLen - 0.3, 0]} args={[armR * 0.85, armR * 0.75, 0.6, 8]} color={skin} />
        <mesh position={[0, -armLen - 0.7, 0]} material={skinMat}>
          <sphereGeometry args={[armR * 1.2, 10, 10]} />
        </mesh>
      </group>
      <group position={[armXR, 6.2, 0]}>
        <Limb position={[0, -armLen / 2, 0]} args={[armR, armR * 0.9, armLen, 8]} color={outfit.shirt} />
        <Limb position={[0, -armLen - 0.3, 0]} args={[armR * 0.85, armR * 0.75, 0.6, 8]} color={skin} />
        <mesh position={[0, -armLen - 0.7, 0]} material={skinMat}>
          <sphereGeometry args={[armR * 1.2, 10, 10]} />
        </mesh>
        <mesh position={[0, -armLen + 0.15, 0]} material={braceletMat}>
          <torusGeometry args={[armR * 1.3, 0.04, 8, 16]} />
        </mesh>
      </group>

      <mesh position={[0, 4.7, 0]} material={pantsMat}>
        <boxGeometry args={[hipW, 0.6, chestD * 0.85]} />
      </mesh>

      <mesh position={[0, 4.95, 0]}>
        <boxGeometry args={[hipW + 0.05, 0.12, chestD * 0.88]} />
        <meshToonMaterial color="#4A3828" />
      </mesh>
      <mesh position={[0, 4.95, chestD * 0.42]}>
        <boxGeometry args={[0.15, 0.1, 0.04]} />
        <meshToonMaterial color="#8A7A62" />
      </mesh>

      <group position={[legXL, 3.2, 0]}>
        <Limb position={[0, 0, 0]} args={[legR, legR * 0.85, legLen, 8]} color={outfit.pants} />
        <mesh position={[0, -legLen / 2 - 0.15, 0.08]} material={shoeMat}>
          <boxGeometry args={[legR * 2.4, 0.35, legR * 3.5]} />
        </mesh>
        <mesh position={[0, -legLen / 2 - 0.32, 0.08]} material={soleMat}>
          <boxGeometry args={[legR * 2.6, 0.08, legR * 3.7]} />
        </mesh>
      </group>
      <group position={[legXR, 3.2, 0]}>
        <Limb position={[0, 0, 0]} args={[legR, legR * 0.85, legLen, 8]} color={outfit.pants} />
        <mesh position={[0, -legLen / 2 - 0.15, 0.08]} material={shoeMat}>
          <boxGeometry args={[legR * 2.4, 0.35, legR * 3.5]} />
        </mesh>
        <mesh position={[0, -legLen / 2 - 0.32, 0.08]} material={soleMat}>
          <boxGeometry args={[legR * 2.6, 0.08, legR * 3.7]} />
        </mesh>
      </group>

      <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 24]} />
        <meshBasicMaterial color="#000000" opacity={0.15} transparent />
      </mesh>
    </group>
  );
}
