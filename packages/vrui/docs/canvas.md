# Canvas

Use the `canvas` factory for canvas elements and treat drawing as an imperative
escape hatch. Keep setup inside `ref` or `onMount`, and use cleanup-aware
helpers for resize and global listeners.

This example loads an image, resizes the backing store for `devicePixelRatio`,
draws the image, and maps pointer coordinates from CSS pixels to canvas pixels.

```ts
import { canvas, div, img, onResize, onTarget } from "@vaakx-dev/vrui";

const image = img({ src: imageUrl });

let point = { x: 0, y: 0 };

function canvasPoint(el: HTMLCanvasElement, event: PointerEvent) {
  const rect = el.getBoundingClientRect();
  const scaleX = el.width / rect.width;
  const scaleY = el.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function resizeCanvas(el: HTMLCanvasElement) {
  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  el.width = Math.max(1, Math.round(rect.width * dpr));
  el.height = Math.max(1, Math.round(rect.height * dpr));
}

function draw(el: HTMLCanvasElement) {
  const ctx = el.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, el.width, el.height);
  if (image.complete) ctx.drawImage(image, 0, 0, el.width, el.height);
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 6 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
  ctx.fill();
}

const view = div(
  canvas({
    style: { width: 320, height: 180 },
    onMount: (node) => {
      const el = node as HTMLCanvasElement;
      const render = () => {
        resizeCanvas(el);
        draw(el);
      };

      onTarget(el, image, "load", render, { once: true });
      onResize(el, render);
      render();
    },
    onPointerMove: (event) => {
      const el = event.currentTarget as HTMLCanvasElement;
      point = canvasPoint(el, event);
      draw(el);
    },
  }),
);
```
