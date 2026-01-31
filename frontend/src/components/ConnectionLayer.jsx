import React from 'react';
import { useTheme } from '@mui/material/styles';
import { extractTags } from './sheet-parts/sheet-utils';

export default function ConnectionLayer({ sheets }) {
  const theme = useTheme();
  const getSheet = (id) => sheets.find(s => s._id === id);

  const glowColor = theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff';

  return (
    <svg style={{ 
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
      overflow: 'visible', pointerEvents: 'none', zIndex: 0 
    }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#1976d2" />
        </marker>
      </defs>

      {sheets.map(source => {
        if (!source.connections || source.connections.length === 0) return null;

        const sourceTags = extractTags(source.content || "");

        return source.connections.map(targetId => {
          const target = getSheet(targetId);
          if (!target) return null;

          const targetTags = extractTags(target.content || "");
          const commonTags = sourceTags.filter(tag => targetTags.includes(tag));

          if (commonTags.length === 0) return null;

          return commonTags.map(tag => {
            const sourceIndex = sourceTags.indexOf(tag);
            const targetIndex = targetTags.indexOf(tag);

            const sourceWidth = source.width || 320;
            const targetWidth = target.width || 320;

            const getDotY = (sheetY, index) => sheetY + 60 + (index * 30) + 6;

            const startX = source.positionInSpace.x + sourceWidth; 
            const startY = getDotY(source.positionInSpace.y, sourceIndex);
            
            const endDotX = target.positionInSpace.x + targetWidth; 
            const endY = getDotY(target.positionInSpace.y, targetIndex);

            const midX = (startX + endDotX) / 2;
            
            const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endDotX} ${endY}`;

            return (
              <g key={`${source._id}-${targetId}-${tag}`}>
                
                {/* 1. Halo Line */}
                <path d={pathData} stroke={glowColor} strokeWidth="5" fill="none" opacity="1" />

                {/* 2. Main Line */}
                <path d={pathData} stroke="#1976d2" strokeWidth="2" fill="none" opacity="0.6" markerEnd="url(#arrowhead)" />
                
                {/* 3. Label - Moved to Source */}
                <text 
                  x={startX + 20} // Just to the right of the dot
                  y={startY - 5}  // Just above the line
                  fill="#1976d2" 
                  fontSize="11" 
                  fontWeight="bold"
                  textAnchor="start" // Align Left
                  style={{ 
                    textShadow: `0px 0px 4px ${glowColor}, 0px 0px 2px ${glowColor}` 
                  }}
                >
                  To: {target.title}
                </text>
              </g>
            );
          });
        });
      })}
    </svg>
  );
}
