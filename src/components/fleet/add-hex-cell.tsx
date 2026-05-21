// src/components/fleet/add-hex-cell.tsx
"use client";

import * as React from "react";
import styles from "./fleet-tokens.module.css";

interface AddHexCellProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  size?: number;
  label?: string;
}

/**
 * Dashed empty hex cell with a "+" glyph — the "add agent" affordance that
 * tessellates into a MachineCluster at the next free spiral slot.
 * forwardRef so the repo's Radix Tooltip can attach a trigger ref to it.
 */
export const AddHexCell = React.forwardRef<HTMLButtonElement, AddHexCellProps>(
  function AddHexCell({ size = 62, onClick, label = "Add agent", ...rest }, ref) {
    const W = size;
    const H = (W * 2) / Math.sqrt(3);
    const pts = `${W / 2},1 ${W - 1},${H / 4} ${W - 1},${(3 * H) / 4} ${W / 2},${H - 1} 1,${(3 * H) / 4} 1,${H / 4}`;
    return (
      <button
        ref={ref}
        onClick={onClick}
        aria-label={label}
        className={styles.hexAdd}
        style={{ width: W, height: H, display: "grid", placeItems: "center" }}
        {...rest}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }}>
          <polygon
            points={pts}
            fill="transparent"
            stroke="var(--hex-add-stroke)"
            strokeWidth={1.4}
            strokeDasharray="4 4"
            strokeLinejoin="round"
          />
          <g
            transform={`translate(${W / 2}, ${H / 2})`}
            stroke="var(--hex-add-stroke)"
            strokeWidth={1.6}
            strokeLinecap="round"
          >
            <line x1={-7} y1={0} x2={7} y2={0} />
            <line x1={0} y1={-7} x2={0} y2={7} />
          </g>
        </svg>
      </button>
    );
  },
);
