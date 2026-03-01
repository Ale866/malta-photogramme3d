uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;

varying float vElevation;
varying vec2 vUv;

#include <fog_pars_fragment>

void main()
{
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);

    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edgeFade = smoothstep(0.04, 0.24, edgeDistance);
    vec3 horizonColor = vec3(0.9019608, 0.9411765, 1.0);
    color = mix(horizonColor, color, edgeFade);

    gl_FragColor = vec4(color, edgeFade);

    #include <fog_fragment>
}
