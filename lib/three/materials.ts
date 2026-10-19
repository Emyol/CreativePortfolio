import type * as THREE from "three";
import type { MotionTier } from "@/lib/motion/tier";

/**
 * The device's materials, rebuilt for real time from art/blender/side-a/device.py's M table
 * (Blender's procedural brushing, rings and knurling don't travel in glTF). Keyed by the
 * material names the GLB keeps. The aluminium is brushed with anisotropy along its planar UV.
 */
export function makeMaterials(three: typeof THREE, tier: MotionTier): Record<string, THREE.Material> {
  const phys = (o: THREE.MeshPhysicalMaterialParameters) => new three.MeshPhysicalMaterial(o);
  const brushed = (color: string, roughness: number) => phys({ color, metalness: 1, roughness, anisotropy: 0.5, anisotropyRotation: 0 });
  const materials: Record<string, THREE.Material> = {
    Aluminium: brushed("#C9CDD3", 0.3),
    AluDoor: brushed("#C3C7CD", 0.36),
    Collar: phys({ color: "#B9BDC4", metalness: 1, roughness: 0.22 }),
    OLED: phys({ color: "#040405", roughness: 0.3, clearcoat: 0.25, clearcoatRoughness: 0.06 }),
    LED: phys({ color: "#1C0602", roughness: 0.08, clearcoat: 1, emissive: "#FF2E00", emissiveIntensity: 0 }),
    Grille: phys({ color: "#16171A", roughness: 0.7 }),
    Shell: phys({ color: "#2A2C31", roughness: 0.42 }),
    ShellInside: phys({ color: "#7A7E85", roughness: 0.5 }),
    Label: phys({ color: "#EFEDE8", roughness: 0.85 }),
    Ink: phys({ color: "#16171A", roughness: 0.6 }),
    InkSoft: phys({ color: "#9CA0A7", roughness: 0.7 }),
    // Real refraction on desktop; phones get a light, cheap see-through.
    Window:
      tier === "full"
        ? phys({ color: "#F2F6F8", roughness: 0.03, transmission: 1, thickness: 0.05, ior: 1.49 })
        : phys({ color: "#F2F6F8", roughness: 0.03, transparent: true, opacity: 0.18, clearcoat: 1, depthWrite: false }),
    Tape: phys({ color: "#1E120C", metalness: 0.35, roughness: 0.2 }),
    Hub: phys({ color: "#F3F3F1", roughness: 0.42 }),
    Screw: phys({ color: "#9EA2A8", metalness: 1, roughness: 0.3 }),
    Knob: phys({ color: "#FF2E00", roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.12 }),
    KnobMark: phys({ color: "#FAFAF8", roughness: 0.4 }),
    Key: phys({ color: "#A2A6AD", roughness: 0.48 }),
    Rubber: phys({ color: "#1A1B1E", roughness: 0.85 }),
    Sticker: phys({ color: "#F4F4F1", roughness: 0.8 }),
  };
  // Named as in the GLB, so a view can find one (the flip swaps its window glass).
  for (const [name, m] of Object.entries(materials)) m.name = name;
  return materials;
}
