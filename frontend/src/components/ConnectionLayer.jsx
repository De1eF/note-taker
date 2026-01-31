import React, { useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { extractTags } from './sheet-parts/sheet-utils';

export default function ConnectionLayer({ sheets }) {
  const theme = useTheme();
  
  const LINE_COLOR = theme.palette.primary.main;
  const TEXT_COLOR = theme.palette.text.secondary;
  const HEADER_HEIGHT = 60;
  const TAG_ITEM_HEIGHT = 30;
  const DOT_OFFSET_Y = 6; 
  const CURVE_INTENSITY = 80;

  const connections = useMemo(() => {
    if (!sheets || sheets.length === 0) return [];

    const tagMap = {}; 
    const calculatedConnections = [];

    // 1. Group sheets by tags
    sheets.forEach(sheet => {
      const tags = extractTags(sheet.content);
      tags.forEach((tag, index) => {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push({ sheet, index });
      });
    });

    // 2. Create connections (All-to-All Mesh Strategy)
    Object.keys(tagMap).forEach(tag => {
      const group = tagMap[tag];
      
      if (group.length > 1) {
        // Nested loop ensures every occurrence connects to every other occurrence
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const startObj = group[i];
            const endObj = group[j];

            const startSheet = startObj.sheet;
            const endSheet = endObj.sheet;

            if (!startSheet.positionInSpace || !endSheet.positionInSpace) continue;

            // Calculate Start Position
            const startX = startSheet.positionInSpace.x + (startSheet.width || 320); 
            const startY = startSheet.positionInSpace.y + HEADER_HEIGHT + (startObj.index * TAG_ITEM_HEIGHT) + DOT_OFFSET_Y;

            // Calculate End Position
            const endX = endSheet.positionInSpace.x + (endSheet.width || 320);
            const endY = endSheet.positionInSpace.y + HEADER_HEIGHT + (endObj.index * TAG_ITEM_HEIGHT) + DOT_OFFSET_Y;

            // Bezier Curve Logic
            const dist = Math.abs(startY - endY) + Math.abs(startX - endX);
            const offset = CURVE_INTENSITY + (dist * 0.1); 

            const cp1x = startX + offset;
            const cp1y = startY;
            const cp2x = endX + offset;
            const cp2y = endY;

            const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

            calculatedConnections.push({
              // Unique ID including both sheet IDs to avoid React key collisions
              id: `${tag}-${startSheet._id}-${startObj.index}-${endSheet._id}-${endObj.index}`,
              path: pathData,
              tag: tag,
              startX, startY,
              endX, endY,
              startLabel: endSheet.title || 'Untitled',
              endLabel: startSheet.title || 'Untitled'
            });
          }
        }
      }
    });

    return calculatedConnections;
  }, [sheets, LINE_COLOR]);

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}>
      <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {connections.map(conn => (
          <g key={conn.id}>
             <path
                d={conn.path}
                fill="none"
                stroke={LINE_COLOR}
                strokeWidth="2"
                opacity="0.4" // Slightly lower opacity looks better in a mesh
             />
             <text 
               x={conn.startX + 15} 
               y={conn.startY + 4}
               fill={TEXT_COLOR}
               fontSize="10"
               fontWeight="500"
               style={{ textShadow: `0 0 4px ${theme.palette.background.default}` }}
             >
               → {conn.startLabel}
             </text>
             <text 
               x={conn.endX + 15} 
               y={conn.endY + 4}
               fill={TEXT_COLOR}
               fontSize="10"
               fontWeight="500"
               style={{ textShadow: `0 0 4px ${theme.palette.background.default}` }}
             >
               ← {conn.endLabel}
             </text>
          </g>
        ))}
      </svg>
    </Box>
  );
}
