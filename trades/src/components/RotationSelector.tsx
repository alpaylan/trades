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
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "10px",
				border: "2px solid #333",
				borderRadius: "8px",
				backgroundColor: "#f0f0f0",
				marginTop: "10px",
			}}
		>
			<div style={{ fontWeight: "bold" }}>Select Rotation:</div>
			<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
				{rotations.map((rotation) => (
					<button
						key={rotation}
						type="button"
						onClick={() => dispatch({ type: "SET_ROTATION", payload: rotation })}
						style={{
							padding: "8px 16px",
							border: "2px solid",
							borderColor:
								state.selected &&
								state.selected.type_ === "road" &&
								effectiveRotation === rotation
									? "#007bff"
									: "#ccc",
							backgroundColor:
								state.selected &&
								state.selected.type_ === "road" &&
								effectiveRotation === rotation
									? "#007bff"
									: "white",
							color:
								state.selected &&
								state.selected.type_ === "road" &&
								effectiveRotation === rotation
									? "white"
									: "#333",
							borderRadius: "4px",
							cursor: "pointer",
						}}
						title={`Rotate ${rotation}°`}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "4px",
							}}
						>
							<img
								src={`src/assets/road-${state.selected.road}.svg`}
								alt={`${state.selected.road} road`}
								style={{
									width: "32px",
									height: "32px",
									transform: `rotate(${rotation}deg)`,
								}}
							/>
							<span style={{ fontSize: "12px" }}>{rotation}°</span>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
