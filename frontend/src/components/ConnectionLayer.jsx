import React, { useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { extractTags } from './sheet-parts/sheet-utils';

export default function ConnectionLayer({ sheets }) {
  const theme = useTheme();
  
  // Visual Configuration
  const LINE_COLOR = theme.palette.primary.main;
  const TEXT_COLOR = theme.palette.text.secondary;
  const HEADER_HEIGHT = 60;
  const TAG_ITEM_HEIGHT = 30;
  const DOT_OFFSET_Y = 6; // Center of the 12px dot
  const CURVE_INTENSITY = 80; // How far the curve swings out

  const connections = useMemo(() => {
    if (!sheets || sheets.length === 0) return [];

    const tagMap = {}; 
    const calculatedConnections = [];

    // 1. Group sheets by tags and store the tag's index for position calculation
    sheets.forEach(sheet => {
      const tags = extractTags(sheet.content);
      tags.forEach((tag, index) => {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push({ sheet, index });
      });
    });

    // 2. Create connections
    Object.keys(tagMap).forEach(tag => {
      const group = tagMap[tag];
      
      // Chain strategy: Connect 0->1, 1->2, etc.
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          const startObj = group[i];
          const endObj = group[i + 1];

          const startSheet = startObj.sheet;
          const endSheet = endObj.sheet;

          // Guard against missing positions
          if (!startSheet.positionInSpace || !endSheet.positionInSpace) continue;

          // --- CALCULATE EXACT DOT POSITIONS ---
          // Logic must match Sheet.jsx styling: 
          // Top: 60 + (index * 30)
          // Right: -6px (which creates a center X roughly at sheet width)
          
          const startX = startSheet.positionInSpace.x + (startSheet.width || 320); 
          const startY = startSheet.positionInSpace.y + HEADER_HEIGHT + (startObj.index * TAG_ITEM_HEIGHT) + DOT_OFFSET_Y;

          const endX = endSheet.positionInSpace.x + (endSheet.width || 320);
          const endY = endSheet.positionInSpace.y + HEADER_HEIGHT + (endObj.index * TAG_ITEM_HEIGHT) + DOT_OFFSET_Y;

          // --- BEZIER CURVE LOGIC ---
          // Since dots are on the Right side, we want the line to exit Right and enter Right.
          // We use Control Points (cp) shifted to the right.
          
          // Distance affects curvature slightly
          const dist = Math.abs(startY - endY) + Math.abs(startX - endX);
          const offset = CURVE_INTENSITY + (dist * 0.1); 

          const cp1x = startX + offset;
          const cp1y = startY;
          const cp2x = endX + offset;
          const cp2y = endY;

          const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

          calculatedConnections.push({
            id: `${tag}-${startSheet._id}-${endSheet._id}`,
            path: pathData,
            tag: tag,
            // Info for labels
            startX, startY,
            endX, endY,
            startLabel: endSheet.title, // Label near Start shows Target name
            endLabel: startSheet.title  // Label near End shows Source name
          });
        }
      }
    });

    return calculatedConnections;
  }, [sheets, LINE_COLOR]);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0, 
        overflow: 'visible'
      }}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible'
        }}
      >
        <defs>
          <filter id="solid-bg" x="0" y="0" width="1" height="1">
            <feFlood floodColor={theme.palette.background.default} result="bg" />
            <feMerge>
              <feMergeNode in="bg"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {connections.map(conn => (
          <g key={conn.id}>
             {/* The Curve */}
             <path
                d={conn.path}
                fill="none"
                stroke={LINE_COLOR}
                strokeWidth="2"
                opacity="0.6"
             />

             {/* Start Label (Target Sheet Name) */}
             <text 
               x={conn.startX + 15} 
               y={conn.startY + 4}
               fill={TEXT_COLOR}
               fontSize="11"
               fontWeight="500"
               style={{ textShadow: `0 0 4px ${theme.palette.background.default}` }}
             >
               → {conn.startLabel}
             </text>

             {/* End Label (Source Sheet Name) */}
             <text 
               x={conn.endX + 15} 
               y={conn.endY + 4}
               fill={TEXT_COLOR}
               fontSize="11"
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
