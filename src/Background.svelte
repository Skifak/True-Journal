<script lang="ts">
  import { onMount } from 'svelte';
  import { BACKGROUND_SOURCES } from './lib/background';

  let canvas: HTMLCanvasElement;
  let state: 'idle' | 'playing' | 'failed' = 'idle';

  const vertexShader = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    precision mediump float;
    uniform sampler2D frame;
    uniform vec2 viewport;
    uniform vec2 videoSize;
    varying vec2 uv;
    void main() {
      float scale = max(viewport.x / videoSize.x, viewport.y / videoSize.y);
      vec2 fitted = videoSize * scale;
      vec2 visible = min(vec2(1.0), viewport / fitted);
      vec2 sampleUv = (1.0 - visible) * 0.5 + uv * visible;
      gl_FragColor = texture2D(frame, sampleUv);
    }
  `;

  function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('WebGL shader allocation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'WebGL shader compilation failed';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state = 'failed';
      return;
    }

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });
    if (!gl) {
      state = 'failed';
      return;
    }

    let animationFrame = 0;
    let disposed = false;
    let texture: WebGLTexture | null = null;
    let video: HTMLVideoElement | null = null;
    let loaded = false;

    try {
      const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
      const program = gl.createProgram();
      if (!program) throw new Error('WebGL program allocation failed');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'WebGL program link failed');
      }
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('WebGL buffer allocation failed');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      texture = gl.createTexture();
      if (!texture) throw new Error('WebGL texture allocation failed');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // DOM video frames start at the top-left; flip rows to match WebGL's UV origin.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.uniform1i(gl.getUniformLocation(program, 'frame'), 0);

      const viewportUniform = gl.getUniformLocation(program, 'viewport');
      const videoSizeUniform = gl.getUniformLocation(program, 'videoSize');
      const resize = (): void => {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const width = Math.max(1, Math.round(window.innerWidth * dpr));
        const height = Math.max(1, Math.round(window.innerHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
          gl.uniform2f(viewportUniform, width, height);
        }
      };
      resize();

      const draw = (): void => {
        if (disposed) return;
        resize();
        if (loaded && video && texture && video.videoWidth && video.videoHeight) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform2f(videoSizeUniform, video.videoWidth, video.videoHeight);
          try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          } catch {
            state = 'failed';
          }
        }
        animationFrame = window.requestAnimationFrame(draw);
      };

      video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      let sourceIndex = 0;

      const tryNextSource = (): void => {
        if (!video || sourceIndex >= BACKGROUND_SOURCES.length) {
          state = 'failed';
          return;
        }
        video.src = BACKGROUND_SOURCES[sourceIndex].src;
        sourceIndex += 1;
        video.load();
      };

      video.addEventListener('loadeddata', () => {
        loaded = true;
        state = 'playing';
        void video?.play().catch(() => {});
      });
      video.addEventListener('error', tryNextSource);
      tryNextSource();
      window.addEventListener('resize', resize, { passive: true });
      animationFrame = window.requestAnimationFrame(draw);

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        window.removeEventListener('resize', resize);
        if (video) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
        if (texture) gl.deleteTexture(texture);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    } catch {
      state = 'failed';
    }
  });
</script>

<div class="bg" class:bg--video-on={state === 'playing'} class:bg--video-failed={state === 'failed'} aria-hidden="true">
  <div class="bg__fallback"></div>
</div>

<canvas bind:this={canvas} class="bg__canvas" class:bg--video-on={state === 'playing'} aria-hidden="true"></canvas>
<div class="bg__noise" aria-hidden="true"></div>

<style>
  .bg {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--bg);
  }

  .bg__noise {
    position: fixed;
    inset: 0;
    z-index: 30;
    pointer-events: none;
    transform: translateZ(0);
    mix-blend-mode: normal;
    background-image: url('/assets/noise.png');
    background-repeat: repeat;
    background-size: 239px 239px;
  }

  .bg__fallback {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: #161819;
  }

  .bg__canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 40;
    pointer-events: none;
    opacity: 0;
    mix-blend-mode: multiply;
    transition: opacity 1s var(--ease-out);
  }

  .bg__canvas.bg--video-on {
    opacity: 0.6;
  }

</style>
