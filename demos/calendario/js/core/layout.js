function overlaps(a, b) {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

export function calculateVisibleDayLayout(containerWidth, timeWidth, minDayWidth = 152, totalDays = 7) {
  const safeContainerWidth = Math.max(0, Number(containerWidth) || 0);
  const safeTimeWidth = Math.max(0, Number(timeWidth) || 0);
  const safeMinimum = Math.max(1, Number(minDayWidth) || 152);
  const safeTotal = Math.max(1, Math.floor(Number(totalDays) || 7));
  const availableDayWidth = Math.max(0, safeContainerWidth - safeTimeWidth);
  const visibleDayCount = Math.min(safeTotal, Math.max(1, Math.floor(availableDayWidth / safeMinimum)));
  const dayWidth = availableDayWidth / visibleDayCount;
  return {
    visibleDayCount,
    dayWidth,
    innerWidth: safeTimeWidth + dayWidth * safeTotal
  };
}

export function overlapComponents(segments) {
  const sorted = [...segments].sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute || a.segmentId.localeCompare(b.segmentId));
  const components = [];
  let current = [];
  let furthestEnd = -Infinity;
  for (const segment of sorted) {
    if (current.length && segment.startMinute >= furthestEnd) {
      components.push(current);
      current = [];
      furthestEnd = -Infinity;
    }
    current.push(segment);
    furthestEnd = Math.max(furthestEnd, segment.endMinute);
  }
  if (current.length) components.push(current);
  return components;
}

function packLane(segments, lane) {
  const copies = segments
    .filter((segment) => segment.type === lane)
    .map((segment) => ({ ...segment, lane, fragmentId: `${segment.segmentId}:${lane}` }));
  const result = [];
  for (const component of overlapComponents(copies)) {
    const columnEnds = [];
    const assigned = component.map((segment) => {
      let column = columnEnds.findIndex((end) => end <= segment.startMinute);
      if (column < 0) {
        column = columnEnds.length;
        columnEnds.push(segment.endMinute);
      } else {
        columnEnds[column] = segment.endMinute;
      }
      return { segment, column };
    });
    const columns = Math.max(1, columnEnds.length);
    for (const { segment, column } of assigned) {
      const width = 50 / columns;
      result.push({
        ...segment,
        column,
        columns,
        leftPercent: (lane === "sofia" ? 50 : 0) + column * width,
        widthPercent: width,
        hasCollision: columns > 1
      });
    }
  }
  return result;
}

function packCouples(segments) {
  const couples = segments
    .filter((segment) => segment.type === "casal")
    .map((segment) => ({ ...segment, lane: "casal", fused: true, fragmentId: `${segment.segmentId}:casal` }));
  const result = [];
  for (const component of overlapComponents(couples)) {
    const columnEnds = [];
    const assigned = component.map((segment) => {
      let column = columnEnds.findIndex((end) => end <= segment.startMinute);
      if (column < 0) { column = columnEnds.length; columnEnds.push(segment.endMinute); }
      else columnEnds[column] = segment.endMinute;
      return { segment, column };
    });
    const columns = Math.max(1, columnEnds.length);
    for (const { segment, column } of assigned) {
      result.push({
        ...segment,
        column,
        columns,
        leftPercent: column * (100 / columns),
        widthPercent: 100 / columns,
        hasCollision: columns > 1
      });
    }
  }
  return result;
}

export function layoutDaySegments(segments) {
  return [...packCouples(segments), ...packLane(segments, "joao"), ...packLane(segments, "sofia")]
    .sort((a, b) => a.startMinute - b.startMinute || a.leftPercent - b.leftPercent || a.fragmentId.localeCompare(b.fragmentId));
}

export function segmentsOverlap(a, b) {
  return overlaps(a, b);
}
