import * as THREE from "three";

/**
 * Custom shader for the pipe: a dim glass tube that fills with glowing,
 * flowing liquid up to `uFront` (0..1 along the tube length). A bright meniscus
 * rides the fill front, Fresnel gives the glass its rim-light, and Bloom
 * (post-processing) turns the emissive liquid into neon. UV.x runs along the
 * tube length for THREE.TubeGeometry, which is what makes the fill possible.
 */
export interface LiquidUniforms {
  uTime: { value: number };
  uFront: { value: number };
  uColor: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uFlow: { value: number };
  uGlow: { value: number };
}

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  uniform float uTime;
  uniform float uFront;
  uniform float uFlow;
  uniform float uGlow;
  uniform vec3  uColor;
  uniform vec3  uColorB;

  void main() {
    float along = vUv.x;

    // Fresnel rim from view angle.
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 2.4);

    // Filled where along <= uFront, with a soft edge.
    float filled = 1.0 - smoothstep(uFront - 0.012, uFront + 0.004, along);

    // Travelling flow bands inside the liquid.
    float bands = 0.5 + 0.5 * sin(along * 58.0 - uTime * 5.5 * uFlow);
    bands = pow(bands, 2.2);

    // Bright meniscus at the moving fill front.
    float front = smoothstep(0.025, 0.0, abs(along - uFront)) * step(0.001, uFront);

    vec3 glass  = uColor * 0.05 + vec3(0.015, 0.02, 0.03);
    vec3 liquid = uColor * (0.45 + 0.95 * bands) + uColorB * (front * 1.8 + 0.15);

    vec3 col = mix(glass, liquid, filled);
    col += fres * mix(vec3(0.10), uColor, filled) * 1.1;
    col += front * uColorB * 1.4;
    col *= uGlow;

    float alpha = mix(0.22, 0.96, filled) + fres * 0.28 + front * 0.4;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export const liquidVertexShader = vertex;
export const liquidFragmentShader = fragment;

/** Fresh uniforms object for a <shaderMaterial>; mutated each frame via the material ref. */
export function makeLiquidUniforms(color: THREE.ColorRepresentation = "#22d3ee"): LiquidUniforms {
  const base = new THREE.Color(color);
  const bright = base.clone().lerp(new THREE.Color("#ffffff"), 0.55);
  return {
    uTime: { value: 0 },
    uFront: { value: 0 },
    uFlow: { value: 1 },
    uGlow: { value: 1 },
    uColor: { value: base },
    uColorB: { value: bright },
  };
}
