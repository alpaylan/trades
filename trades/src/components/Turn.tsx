import type { TileOwner } from "../logic/Game";

export default function Turn({
    turn,
}: {
    turn: TileOwner
}) {
    return (
        <div id="turn" className={`turn turn-${turn}`}>
            <div className="turn-label">
                <span className={`turn-indicator turn-${turn}`} aria-hidden="true" />
                <span>Turn: {turn}</span>
            </div>
        </div>
    );
}
