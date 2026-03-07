import { ROAD_ROTATIONS, type RoadRotation } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

export default function RotationSelector() {
	const { state, dispatch } = useGlobalContext();

	const isRoad = state.selected?.type_ === "road";
	const isCanal = state.selected?.type_ === "canal";
	if (!state.selected || (!isRoad && !isCanal)) {
		return null;
	}
	// Crossroad looks the same at every rotation — no need to choose
	if (isRoad && state.selected.road === "plus") {
		return null;
	}
	// Straight road (i) and straight canal: only 0° and 90°
	const rotations: RoadRotation[] = isCanal
		? state.selected.canal === "straight"
			? [0, 90]
			: [0, 90, 180, 270]
		: state.selected.road === "i"
			? [0, 90]
			: [...ROAD_ROTATIONS];
	const effectiveRotation =
		isRoad && state.selected.road === "i" && (state.selected.rotation === 180 || state.selected.rotation === 270)
			? (state.selected.rotation === 180 ? 0 : 90)
			: isCanal && state.selected.canal === "straight" && (state.selected.rotation === 180 || state.selected.rotation === 270)
				? (state.selected.rotation === 180 ? 0 : 90)
				: state.selected.rotation;

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
				{isCanal ? (
					<img
						src={`/assets/canal-${state.selected.canal}.svg`}
						alt=""
						style={{
							width: 14,
							height: 14,
							transform: `rotate(${effectiveRotation}deg)`,
						}}
					/>
				) : (
					<img
						src={`/assets/road-${state.selected.road}.svg`}
						alt=""
						style={{
							width: 14,
							height: 14,
							transform: `rotate(${effectiveRotation}deg)`,
						}}
					/>
				)}
			</span>
			<div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
				{rotations.map((rotation) => {
					const isSelected =
						(isRoad && state.selected.type_ === "road" && effectiveRotation === rotation) ||
						(isCanal && state.selected.type_ === "canal" && effectiveRotation === rotation);
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
