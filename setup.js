import {
  drawCheckerboard,
  drawHandle,
  snapHandle,
  scanlineFillPolygon,
  getClosestPointOnSegmentWithinDistance,
} from "./helpers.js";

const GRID_SIZE = 512 / 16;

const dragState = {
  isDragging: false,
  dragTargets: [],
  dragTargetOrigins: [],
  dragOffsets: [],
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

function findDropTargetInRange(targetX, targetY, handles) {
  const rangeSquared = (GRID_SIZE / 2) ** 2;
  const foundHandle = handles.findIndex((handle, index) => {
    const handleCanvasX = handle.x * GRID_SIZE;
    const handleCanvasY = handle.y * GRID_SIZE;
    const xDistSquared = (targetX - handleCanvasX) ** 2;
    const yDistSquared = (targetY - handleCanvasY) ** 2;
    const handleInRange = xDistSquared + yDistSquared < rangeSquared;
    dragState.isDragging = handleInRange;
    if (dragState.isDragging) {
      dragState.dragTargets[0] = index;
      dragState.dragTargetOrigins[0] = {
        x: handlePoints[index].x,
        y: handlePoints[index].y,
      };
      dragState.dragOffsets[0] = {
        x: 0,
        y: 0,
      };
    }
    console.log(handleInRange);
    return handleInRange;
  });

  if (foundHandle === -1) {
    handles.findIndex((handle, index) => {
      const endHandle = (index + 1) % handles.length;
      const pixelX = targetX / GRID_SIZE;
      const pixelY = targetY / GRID_SIZE;

      const dragOffset = getClosestPointOnSegmentWithinDistance(
        { x: pixelX, y: pixelY },
        handle,
        handles[endHandle],
        0.5,
      );

      dragState.isDragging = !!dragOffset;

      if (dragState.isDragging) {
        dragState.dragTargets[0] = index;
        dragState.dragTargets[1] = endHandle;
        dragState.dragTargetOrigins[0] = {
          x: handlePoints[index].x,
          y: handlePoints[index].y,
        };
        dragState.dragOffsets[0] = {
          x: dragOffset.x - handlePoints[index].x,
          y: dragOffset.y - handlePoints[index].y,
        };
        dragState.dragTargetOrigins[1] = {
          x: handlePoints[endHandle].x,
          y: handlePoints[endHandle].y,
        };
        dragState.dragOffsets[1] = {
          x: dragOffset.x - handlePoints[endHandle].x,
          y: dragOffset.y - handlePoints[endHandle].y,
        };
      }
      return dragState.isDragging;
    });
  }
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

    const handleIndex = findDropTargetInRange(
      offsetPoint.x,
      offsetPoint.y,
      handlePoints,
    );
  });

  overlayCanvas.addEventListener("pointermove", (event) => {
    if (dragState.isDragging) {
      const offsetPoint = getPointerOffset(event, overlayCanvas);
      dragState.dragTargets.forEach((dragHandleIndex, targetIndex) => {
        const dragHandle = handlePoints[dragHandleIndex];
        dragHandle.x =
          offsetPoint.x / GRID_SIZE - dragState.dragOffsets[targetIndex].x;
        dragHandle.y =
          offsetPoint.y / GRID_SIZE - dragState.dragOffsets[targetIndex].y;
      });
    }
  });

  overlayCanvas.addEventListener("pointerup", (event) => {
    if (dragState.isDragging) {
      dragState.dragTargets.forEach((dragHandleIndex, targetIndex) => {
        snapHandle(handlePoints[dragHandleIndex]);
      });
      dragState.isDragging = false;
      dragState.dragTargets = [];
      dragState.dragTargetOrigins = [];
      dragState.dragOffsets = [];
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
