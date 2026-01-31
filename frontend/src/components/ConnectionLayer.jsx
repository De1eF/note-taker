import React from 'react';

export default function ConnectionLayer({ sheets }) {
  const getSheet = (id) => sheets.find(s => s._id === id);

  return (
    <svg style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      // width/height can be small as long as overflow is visible
      width: '100%', 
      height: '100%', 
      // CRITICAL FIX: Allow lines to draw outside the bounding box
      overflow: 'visible', 
      pointerEvents: 'none', 
      zIndex: 0 
    }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#1976d2" />
        </marker>
      </defs>

      {sheets.map(source => {
        if (!source.connections || source.connections.length === 0) return null;

        return source.connections.map(targetId => {
          const target = getSheet(targetId);
          if (!target) return null;

          const sourceWidth = source.width || 320;
          const targetWidth = target.width || 320;
          const VERTICAL_OFFSET = 73.5;

          const startX = source.positionInSpace.x + sourceWidth; 
          const startY = source.positionInSpace.y + VERTICAL_OFFSET; 
          
          const endDotX = target.positionInSpace.x + targetWidth;
          const endY = target.positionInSpace.y + VERTICAL_OFFSET;

          const midX = (startX + endDotX) / 2;

          return (
            <g key={`${source._id}-${targetId}`}>
              <path 
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endDotX} ${endY}`}
                stroke="#1976d2" strokeWidth="2" fill="none" opacity="0.4"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        });
      })}
    </svg>
  );
}
