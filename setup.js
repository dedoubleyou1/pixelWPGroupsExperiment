import {
  drawCheckerboard,
  drawHandle,
  snapHandle,
  scanlineFillPolygon,
} from "./helpers.js";

const GRID_SIZE = 512 / 16;

const dragHandleState = {
  isDragging: false,
  dragType: null, // "handle" or "segment"
  dragTargetIndex: null,
  dragTargetOrigin: { x: 0, y: 0 },
  dragCanvasOffset: { x: 0, y: 0 },
};

const handlePoints = [
  { x: 5, y: 5 },
  { x: 11, y: 5 },
  { x: 11, y: 11 },
  { x: 5, y: 11 },
];

function drawPolygon(ctx) {
  ctx.save();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);

  ctx.beginPath();
  ctx.moveTo(handlePoints[0].x * GRID_SIZE, handlePoints[0].y * GRID_SIZE);
  for (let i = 1; i < handlePoints.length; ++i) {
    ctx.lineTo(handlePoints[i].x * GRID_SIZE, handlePoints[i].y * GRID_SIZE);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPolygonFill(ctx) {
  const absPoints = handlePoints.map((point) => {
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
    };
  });
  scanlineFillPolygon(ctx, absPoints, "white");
}

function getPointerOffset(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  return { x: pointerX, y: pointerY };
}

function drawHandles(ctx, handles) {
  for (const handle of handles) {
    drawHandle(ctx, GRID_SIZE * handle.x, GRID_SIZE * handle.y);
  }
}

function findHandleInRange(targetX, targetY, handles) {
  const rangeSquared = (GRID_SIZE / 2) ** 2;
  return handles.findIndex((handle) => {
    const handleCanvasX = handle.x * GRID_SIZE;
    const handleCanvasY = handle.y * GRID_SIZE;
    const xDistSquared = (targetX - handleCanvasX) ** 2;
    const yDistSquared = (targetY - handleCanvasY) ** 2;
    return xDistSquared + yDistSquared < rangeSquared;
  });
}

function init() {
  const bgCanvas = document.getElementById("bg-canvas");
  const bgCtx = bgCanvas.getContext("2d");

  const gridCanvas = document.getElementById("grid-canvas");
  const gridCtx = gridCanvas.getContext("2d");

  const overlayCanvas = document.getElementById("overlay-canvas");
  const overlayCtx = overlayCanvas.getContext("2d");

  overlayCanvas.addEventListener("pointerdown", (event) => {
    const offsetPoint = getPointerOffset(event, overlayCanvas);

    const handleIndex = findHandleInRange(
      offsetPoint.x,
      offsetPoint.y,
      handlePoints,
    );

    dragHandleState.isDragging = handleIndex >= 0;
    if (dragHandleState.isDragging) {
      dragHandleState.dragTargetIndex = handleIndex;
      dragHandleState.dragTargetOrigin.x = handlePoints[handleIndex].x;
      dragHandleState.dragTargetOrigin.y = handlePoints[handleIndex].y;
    }
  });

  overlayCanvas.addEventListener("pointermove", (event) => {
    if (dragHandleState.isDragging) {
      const offsetPoint = getPointerOffset(event, overlayCanvas);
      const dragHandle = handlePoints[dragHandleState.dragTargetIndex];
      dragHandle.x = offsetPoint.x / GRID_SIZE;
      dragHandle.y = offsetPoint.y / GRID_SIZE;
    }
  });

  overlayCanvas.addEventListener("pointerup", (event) => {
    if (dragHandleState.isDragging) {
      dragHandleState.isDragging = false;
      console.log(handlePoints[dragHandleState.dragTargetIndex]);
      snapHandle(handlePoints[dragHandleState.dragTargetIndex]);
    }
  });

  function drawGrid() {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    drawPolygonFill(gridCtx);
  }

  function drawOverlay() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    drawPolygon(overlayCtx);
    drawHandles(overlayCtx, handlePoints, GRID_SIZE);
  }

  function update(timestamp) {
    drawGrid();
    drawOverlay();
    requestAnimationFrame(update);
  }

  drawCheckerboard(bgCtx, bgCanvas.width, bgCanvas.height);
  requestAnimationFrame(update);
}

init();
