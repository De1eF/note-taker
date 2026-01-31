import React, { useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { extractTags } from './sheet-parts/sheet-utils';

export default function ConnectionLayer({ sheets, hoveredTag }) {
  const theme = useTheme();

  const LINE_COLOR = theme.palette.primary.main;
  const HEADER_HEIGHT = 60;
  const TAG_ITEM_HEIGHT = 30;
  const DOT_OFFSET_Y = 6;
  const CURVE_INTENSITY = 80;

  const connections = useMemo(() => {
    if (!sheets || sheets.length === 0) return [];

    const tagMap = {};
    const calculatedConnections = [];

    sheets.forEach(sheet => {
      const tags = extractTags(sheet.content);
      tags.forEach((tag, index) => {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push({ sheet, index });
      });
    });

    Object.entries(tagMap).forEach(([tag, group]) => {
      if (group.length <= 1) return;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];

          if (!a.sheet.positionInSpace || !b.sheet.positionInSpace) continue;

          const startX = a.sheet.positionInSpace.x + (a.sheet.width || 320);
          const startY = a.sheet.positionInSpace.y + HEADER_HEIGHT + a.index * TAG_ITEM_HEIGHT + DOT_OFFSET_Y;

          const endX = b.sheet.positionInSpace.x + (b.sheet.width || 320);
          const endY = b.sheet.positionInSpace.y + HEADER_HEIGHT + b.index * TAG_ITEM_HEIGHT + DOT_OFFSET_Y;

          const dist = Math.abs(startY - endY) + Math.abs(startX - endX);
          const offset = CURVE_INTENSITY + dist * 0.1;

          const cp1x = startX + offset;
          const cp1y = startY;
          const cp2x = endX + offset;
          const cp2y = endY;

          calculatedConnections.push({
            id: `${tag}-${a.sheet._id}-${a.index}-${b.sheet._id}-${b.index}`,
            tag,
            path: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`
          });
        }
      }
    });

    return calculatedConnections;
  }, [sheets]);

  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {connections.map(conn => {
          const active = hoveredTag === conn.tag;

          return (
            <path
              key={conn.id}
              d={conn.path}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={active ? 3 : 2}
              opacity={active ? 0.9 : 0.25}
            />
          );
        })}
      </svg>
    </Box>
  );
}
