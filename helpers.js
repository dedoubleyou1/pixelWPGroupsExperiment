export function drawCheckerboard(ctx, width, height) {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const index = i / 4;
    const xPos = index % width;
    const yPos = Math.floor(index / width);

    if (xPos % 2 === yPos % 2) {
      data[i] = 111; // red
      data[i + 1] = 111; // green
      data[i + 2] = 111; // blue
      data[i + 3] = 255; // alpha
    } else {
      data[i] = 143; // red
      data[i + 1] = 143; // green
      data[i + 2] = 143; // blue
      data[i + 3] = 255; // alpha
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function drawHandle(ctx, x, y) {
  const handleWidth = 8;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, handleWidth, 0, Math.PI * 2, true);
  ctx.closePath();

  ctx.fillStyle = "white";
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "black";
  ctx.stroke();
  ctx.restore();
}

// NOTE: The following helpers were written with assistance from AI

/**
 * Returns the closest point on a segment if its distance is below maxDistance.
 * The closest point is clamped to the segment, including its endpoints.
 * If the endpoints coincide, the segment is treated as a single point.
 * @param {{x: number, y: number}} point - The point to measure from
 * @param {{x: number, y: number}} segmentStart - The first endpoint
 * @param {{x: number, y: number}} segmentEnd - The second endpoint
 * @param {number} maxDistance - Distance threshold in the same units as the points
 * @returns {{x: number, y: number}|undefined} The closest point, or undefined if too far
 */
export function getClosestPointOnSegmentWithinDistance(
  point,
  segmentStart,
  segmentEnd,
  maxDistance,
) {
  if (maxDistance <= 0) return;

  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const offsetX = point.x - segmentStart.x;
  const offsetY = point.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;

  // Find the closest point on the segment, including its endpoints.
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (offsetX * dx + offsetY * dy) / lengthSquared));

  const distanceX = offsetX - t * dx;
  const distanceY = offsetY - t * dy;

  // Return a position only when it's close enough.
  if (
    distanceX * distanceX + distanceY * distanceY <
    maxDistance * maxDistance
  ) {
    return {
      x: segmentStart.x + t * dx,
      y: segmentStart.y + t * dy,
    };
  }
}

/**
 * Fills a polygon using the Scanline Algorithm with strict Top-Left rules.
 * Each pixel is sampled at its center (x + 0.5, y + 0.5).
 * Samples on top/left boundaries are included; bottom/right are excluded.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {Array<{x: number, y: number}>} vertices - Polygon vertices
 * @param {string} fillColor - The fill color
 */
export function scanlineFillPolygon(ctx, vertices, fillColor) {
  if (vertices.length < 3) return;

  // 1. Find the global bounding range of pixel-center scanlines
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < vertices.length; i++) {
    if (vertices[i].y < yMin) yMin = vertices[i].y;
    if (vertices[i].y > yMax) yMax = vertices[i].y;
  }

  // Row y samples the polygon at y + 0.5.
  const scanlineMin = Math.ceil(yMin - 0.5);
  // Strict Top Rule: We exclude the exact bottom boundary line
  const scanlineMax = Math.ceil(yMax - 0.5) - 1;

  if (scanlineMin > scanlineMax) return;

  // Initialize Edge Table buckets
  const edgeTable = {};
  for (let y = scanlineMin; y <= scanlineMax; y++) {
    edgeTable[y] = [];
  }

  // 2. Build the Edge Table
  for (let i = 0; i < vertices.length; i++) {
    let p1 = vertices[i];
    let p2 = vertices[(i + 1) % vertices.length];

    if (p1.y === p2.y) continue; // Skip perfectly horizontal edges

    // Ensure p1 is the upper point (smaller y)
    if (p1.y > p2.y) {
      let temp = p1;
      p1 = p2;
      p2 = temp;
    }

    // Strict Top Rule: p1.y <= y + 0.5 < p2.y.
    const yStart = Math.ceil(p1.y - 0.5);
    const yEnd = Math.ceil(p2.y - 0.5) - 1;

    if (yStart > yEnd) continue;

    edgeTable[yStart].push({
      yMax: yEnd, // The last integer scanline row this edge influences
      xOrigin: p1.x,
      yOrigin: p1.y,
      dx: p2.x - p1.x,
      dy: p2.y - p1.y,
      xCurrent: 0,
    });
  }

  // 3. Process each scanline row
  let activeEdgeTable = [];
  ctx.fillStyle = fillColor;

  for (let y = scanlineMin; y <= scanlineMax; y++) {
    // Pull new edges into the Active Edge Table
    if (edgeTable[y]) {
      activeEdgeTable.push(...edgeTable[y]);
    }

    // Recalculate from the original edge to avoid accumulated slope rounding.
    // Multiply before dividing to preserve exact crossings at pixel centers.
    for (const edge of activeEdgeTable) {
      edge.xCurrent =
        edge.xOrigin + ((y + 0.5 - edge.yOrigin) * edge.dx) / edge.dy;
    }

    // Sort by current X intersection point
    activeEdgeTable.sort((a, b) => a.xCurrent - b.xCurrent);

    // Fill pixels between pairs using the strict Left-Hand Rule
    for (let i = 0; i < activeEdgeTable.length; i += 2) {
      if (i + 1 < activeEdgeTable.length) {
        // Select columns whose centers satisfy left <= x + 0.5 < right.
        const xStart = Math.ceil(activeEdgeTable[i].xCurrent - 0.5);
        const xEnd = Math.ceil(activeEdgeTable[i + 1].xCurrent - 0.5);

        if (xStart < xEnd) {
          ctx.fillRect(xStart, y, xEnd - xStart, 1);
        }
      }
    }

    // Clean out expired edges
    activeEdgeTable = activeEdgeTable.filter((edge) => edge.yMax > y);
  }
}
