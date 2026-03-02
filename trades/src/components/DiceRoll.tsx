import { useCallback, useEffect, useRef, useState } from "react";
import { road, ROAD_ROTATIONS, type Tilable } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

const DICE_TILE_MAP: Record<number, Tilable | null> = {
	1: null,
	2: null,
	3: road("i", ROAD_ROTATIONS[Math.floor(Math.random() * 4)]),
	4: road("l", ROAD_ROTATIONS[Math.floor(Math.random() * 4)]),
	5: road("t", ROAD_ROTATIONS[Math.floor(Math.random() * 4)]),
	6: road("plus", ROAD_ROTATIONS[Math.floor(Math.random() * 4)]),
};

const DICE_LABELS: Record<number, string> = {
	1: "No road",
	2: "No road",
	3: "Straight Road",
	4: "L-shaped Road",
	5: "T-shaped Road",
	6: "Crossroad",
};

const ROAD_ICONS: Record<number, string> = {
	3: "/assets/road-i.svg",
	4: "/assets/road-l.svg",
	5: "/assets/road-t.svg",
	6: "/assets/road-plus.svg",
};

type Phase =
	| { type: "rolling"; attempt: number }
	| { type: "result"; value: number; attempt: number }
	| { type: "done"; finalValue: number | null };

const DOT_POSITIONS: Record<number, [number, number][]> = {
	1: [[50, 50]],
	2: [[25, 25], [75, 75]],
	3: [[25, 25], [50, 50], [75, 75]],
	4: [[25, 25], [75, 25], [25, 75], [75, 75]],
	5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
	6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function DiceFace({ value, size = 80 }: { value: number; size?: number }) {
	const dots = DOT_POSITIONS[value] ?? [];
	const dotR = size * 0.09;
	return (
		<svg width={size} height={size} viewBox={`0 0 100 100`}>
			<rect
				x={2} y={2} width={96} height={96} rx={14} ry={14}
				fill="#fff" stroke="#333" strokeWidth={2.5}
			/>
			{dots.map(([cx, cy], i) => (
				<circle key={i} cx={cx} cy={cy} r={dotR * (100 / size)} fill="#222" />
			))}
		</svg>
	);
}

function resolveRoll(): number {
	return Math.floor(Math.random() * 6) + 1;
}

export default function DiceRoll() {
	const { state, dispatch } = useGlobalContext();
	const luckyStreak = state.activeEventEffects?.luckyStreak ?? false;
	const maxAttempts = luckyStreak ? Infinity : 3;
	const maxAttemptsLabel = luckyStreak ? "∞" : "3";

	const [phase, setPhase] = useState<Phase>({ type: "rolling", attempt: 1 });
	const [displayValue, setDisplayValue] = useState(1);
	const animFrameRef = useRef<number>(0);
	const rollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

	const finishWithTile = useCallback(
		(value: number | null) => {
			const tile = value ? DICE_TILE_MAP[value] ?? null : null;
			dispatch({ type: "FINISH_DICE_ROLL", payload: { tile } });
		},
		[dispatch],
	);

	useEffect(() => {
		if (phase.type !== "rolling") return;

		let running = true;
		let lastSwitch = 0;
		const switchInterval = 80;

		const animate = (time: number) => {
			if (!running) return;
			if (time - lastSwitch > switchInterval) {
				setDisplayValue(Math.floor(Math.random() * 6) + 1);
				lastSwitch = time;
			}
			animFrameRef.current = requestAnimationFrame(animate);
		};
		animFrameRef.current = requestAnimationFrame(animate);

		rollTimeoutRef.current = setTimeout(() => {
			running = false;
			cancelAnimationFrame(animFrameRef.current);
			const result = resolveRoll();
			setDisplayValue(result);
			setPhase({ type: "result", value: result, attempt: phase.attempt });
		}, 1200);

		return () => {
			running = false;
			cancelAnimationFrame(animFrameRef.current);
			clearTimeout(rollTimeoutRef.current);
		};
	}, [phase, state.game.turn, luckyStreak]);

	useEffect(() => {
		if (phase.type !== "result") return;
		const { value, attempt } = phase;

		const timer = setTimeout(() => {
			if (value >= 3) {
				setPhase({ type: "done", finalValue: value });
			} else if (attempt >= maxAttempts) {
				setPhase({ type: "done", finalValue: null });
			} else {
				setPhase({ type: "rolling", attempt: attempt + 1 });
			}
		}, 1500);
		return () => clearTimeout(timer);
	}, [phase, maxAttempts]);

	if (!state.diceRoll?.active) return null;

	const isRolling = phase.type === "rolling";
	const isResult = phase.type === "result";
	const isDone = phase.type === "done";

	const resultValue = isResult ? phase.value : null;
	const isReroll = isResult && resultValue !== null && resultValue <= 2;
	const attemptNum = isRolling ? phase.attempt : isResult ? phase.attempt : 0;

	const finalValue = isDone ? phase.finalValue : null;
	const won = isDone && finalValue !== null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 10000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "rgba(0,0,0,0.55)",
			}}
		>
			<div
				style={{
					background: "#fff",
					borderRadius: 14,
					padding: "28px 36px",
					boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
					textAlign: "center",
					minWidth: 260,
				}}
			>
				<p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16 }}>
					{isDone
						? won
							? "You won!"
							: "No luck this time..."
						: `Roll ${attemptNum} of ${maxAttemptsLabel}`}
				</p>

				{!isDone && (
					<p style={{ margin: "0 0 16px", fontSize: 12, color: "#777" }}>
						{isRolling
							? "Rolling..."
							: isReroll
								? "Miss! Rolling again..."
								: `${DICE_LABELS[resultValue!]}`}
					</p>
				)}

				{luckyStreak && !isDone && (
					<p style={{ margin: "-10px 0 10px", fontSize: 11, color: "#2e7d32", fontWeight: 600 }}>
						Lucky Streak active — unlimited re-rolls!
					</p>
				)}

				<div
					style={{
						display: "inline-block",
						animation: isRolling ? "dice-shake 0.15s infinite alternate" : undefined,
						transition: "transform 0.3s",
						transform: isRolling ? undefined : "scale(1.1)",
					}}
				>
					<DiceFace value={displayValue} size={90} />
				</div>

				{isDone && (
					<div style={{ marginTop: 16 }}>
						{won && finalValue && ROAD_ICONS[finalValue] && (
							<div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
								<img
									src={ROAD_ICONS[finalValue]}
									alt={DICE_LABELS[finalValue]}
									style={{ width: 36, height: 36 }}
								/>
								<span style={{ fontWeight: 600, fontSize: 14 }}>
									{DICE_LABELS[finalValue]}
								</span>
							</div>
						)}
						{!won && (
							<p style={{ fontSize: 13, color: "#999", margin: "0 0 12px" }}>
								{luckyStreak
									? "Rolled 1 or 2 every time — tough luck!"
									: "Rolled 1 or 2 three times in a row."}
							</p>
						)}
						<button
							type="button"
							onClick={() => finishWithTile(finalValue)}
							style={{
								padding: "8px 24px",
								borderRadius: 8,
								border: "none",
								background: won ? "#2e7d32" : "#777",
								color: "#fff",
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14,
							}}
						>
							{won ? "Claim" : "Continue"}
						</button>
					</div>
				)}

				{isResult && !isDone && resultValue !== null && resultValue >= 3 && (
					<div style={{ marginTop: 12 }}>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
							<img
								src={ROAD_ICONS[resultValue]}
								alt={DICE_LABELS[resultValue]}
								style={{ width: 30, height: 30 }}
							/>
							<span style={{ fontWeight: 600, fontSize: 14 }}>
								{DICE_LABELS[resultValue]}
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
