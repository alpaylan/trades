import { ROAD_ROTATIONS, type RoadRotation } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

export default function RotationSelector() {
	const { state, dispatch } = useGlobalContext();

	const selected = state.selected;
	const isRoad = selected?.type_ === "road";
	const isCanal = selected?.type_ === "canal";
	const isBridge = selected?.type_ === "bridge";
	// bridge_only has no rotation; only road, canal, bridge get rotation selector
	if (!selected || (!isRoad && !isCanal && !isBridge)) {
		return null;
	}
	// Crossroad looks the same at every rotation — no need to choose
	if (selected.type_ === "road" && selected.road === "plus") {
		return null;
	}
	// Straight road (i), straight canal, bridge: only 0° and 90°
	const rotations: RoadRotation[] =
		selected.type_ === "bridge"
			? [0, 90]
			: selected.type_ === "canal"
				? selected.canal === "straight"
					? [0, 90]
					: [0, 90, 180, 270]
				: selected.type_ === "road"
					? selected.road === "i"
						? [0, 90]
						: [...ROAD_ROTATIONS]
					: [];
	const rot = "rotation" in selected ? selected.rotation : 0;
	const effectiveRotation =
		selected.type_ === "road" && selected.road === "i" && (rot === 180 || rot === 270)
			? rot === 180 ? 0 : 90
			: selected.type_ === "canal" && selected.canal === "straight" && (rot === 180 || rot === 270)
				? rot === 180 ? 0 : 90
				: selected.type_ === "bridge" && (rot === 180 || rot === 270)
					? rot === 180 ? 0 : 90
					: rot;

	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "6px",
				padding: "4px 6px",
				borderRadius: "999px",
				backgroundColor: "#f0f0f0",
				marginTop: "6px",
				fontSize: "11px",
			}}
		>
			<span style={{ fontWeight: "bold" }}>Rotation:</span>
			<span
				style={{
					width: 20,
					height: 20,
					borderRadius: 4,
					border: "1px solid rgba(0,0,0,0.2)",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "white",
				}}
				aria-hidden="true"
			>
				{selected.type_ === "bridge" ? (
					<img
						src="/assets/bridge.svg"
						alt=""
						style={{
							width: 14,
							height: 14,
							transform: `rotate(${effectiveRotation}deg)`,
						}}
					/>
				) : selected.type_ === "canal" ? (
					<img
						src={`/assets/canal-${selected.canal}.svg`}
						alt=""
						style={{
							width: 14,
							height: 14,
							transform: `rotate(${effectiveRotation}deg)`,
						}}
					/>
				) : selected.type_ === "road" ? (
					<img
						src={`/assets/road-${selected.road}.svg`}
						alt=""
						style={{
							width: 14,
							height: 14,
							transform: `rotate(${effectiveRotation}deg)`,
						}}
					/>
				) : null}
			</span>
			<div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
				{rotations.map((rotation) => {
					const isSelected =
						(selected.type_ === "road" && effectiveRotation === rotation) ||
						(selected.type_ === "canal" && effectiveRotation === rotation) ||
						(selected.type_ === "bridge" && effectiveRotation === rotation);
					return (
						<button
							key={rotation}
							type="button"
							onClick={() => dispatch({ type: "SET_ROTATION", payload: rotation })}
							style={{
								width: 26,
								height: 26,
								borderRadius: "999px",
								border: "1px solid",
								borderColor: isSelected ? "#1976d2" : "#ccc",
								backgroundColor: isSelected ? "#1976d2" : "white",
								color: isSelected ? "white" : "#333",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "10px",
								cursor: "pointer",
								padding: 0,
							}}
							title={`Rotate ${rotation}°`}
						>
							<span>{rotation}°</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
