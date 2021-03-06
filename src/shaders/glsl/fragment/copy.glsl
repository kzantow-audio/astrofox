uniform sampler2D inputTexture;
uniform float opacity;
uniform int alpha;
varying vec2 vUv;

void main() {
    vec4 texture = texture2D(inputTexture, vUv);

    gl_FragColor = opacity * texture;

    if (alpha == 1) {
        gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
    }
}