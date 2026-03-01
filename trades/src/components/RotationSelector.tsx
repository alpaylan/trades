import { ROAD_ROTATIONS, type RoadRotation } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

export default function RotationSelector() {
	const { state, dispatch } = useGlobalContext();

	if (!state.selected || state.selected.type_ !== "road") {
		return null;
	}
	// Crossroad looks the same at every rotation — no need to choose
	if (state.selected.road === "plus") {
		return null;
	}
	// Straight road (i) only has two distinct orientations: 0° and 90°
	const rotations: RoadRotation[] =
		state.selected.road === "i" ? [0, 90] : [...ROAD_ROTATIONS];
	const effectiveRotation =
		state.selected.road === "i" && (state.selected.rotation === 180 || state.selected.rotation === 270)
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
				<img
					src={`/assets/road-${state.selected.road}.svg`}
					alt=""
					style={{
						width: 14,
						height: 14,
						transform: `rotate(${effectiveRotation}deg)`,
					}}
				/>
			</span>
			<div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
				{rotations.map((rotation) => (
					<button
						key={rotation}
						type="button"
						onClick={() => dispatch({ type: "SET_ROTATION", payload: rotation })}
						style={{
							width: 26,
							height: 26,
							borderRadius: "999px",
							border: "1px solid",
							borderColor:
								state.selected &&
								state.selected.type_ === "road" &&
								effectiveRotation === rotation
									? "#1976d2"
									: "#ccc",
							backgroundColor:
								state.selected &&
								state.selected.type_ === "road" &&
								effectiveRotation === rotation
									? "#1976d2"
									: "white",
							color:
								state.selected &&
								state.selected.type_ === "road" &&
								effectiveRotation === rotation
									? "white"
									: "#333",
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
				))}
			</div>
		</div>
	);
}
