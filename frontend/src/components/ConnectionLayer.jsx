import React from 'react';

export default function ConnectionLayer({ sheets }) {
  // Helper to find sheet by ID
  const getSheet = (id) => sheets.find(s => s._id === id);

  return (
    <svg style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      pointerEvents: 'none', // Let clicks pass through to cards
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

          // Coordinates
          // Note: We add offsets to align with the "Dot" position
          // Assuming card width 300, dot is at (x + 300), center y (y + height/2)
          // For simplicity in this demo, we estimate height ~150px. 
          // Real implementations calculate DOM element positions.
          
          const startX = source.positionInSpace.x + 300; 
          const startY = source.positionInSpace.y + 75; // Approx half height
          const endX = target.positionInSpace.x + 300;
          const endY = target.positionInSpace.y + 75;

          // Control point for a nice curve (Bezier)
          const midX = (startX + endX) / 2;

          return (
            <g key={`${source._id}-${targetId}`}>
              {/* The Line */}
              <path 
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                stroke="#1976d2" 
                strokeWidth="2" 
                fill="none"
                opacity="0.4"
                markerEnd="url(#arrowhead)"
              />
              
              {/* The Label near the start */}
              <text 
                x={startX + 10} 
                y={startY - 5} 
                fill="#1976d2" 
                fontSize="10" 
                fontWeight="bold"
              >
                To: {target.title}
              </text>
            </g>
          );
        });
      })}
    </svg>
  );
}
