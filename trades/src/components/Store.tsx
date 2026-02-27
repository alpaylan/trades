import { type ResourceCollection, type Tilable, road } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

function StoreItem({
	resources,
	price,
	item,
	icon,
	text,
}: {
	resources: ResourceCollection;
	price: number;
	item: Tilable;
	icon: string;
	text: string;
}) {
	const { state, dispatch } = useGlobalContext();
	const current = state.game.turn;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const canAct = actionsUsed < 2;
	const tooltip = `${text} (cost: ${price})`;

	const disabled = resources.dollar < price || !canAct;

	return (
		<button
			type="button"
			disabled={disabled}
			title={tooltip}
			onClick={() => {
				if (disabled) return;
				dispatch({ type: "BUY_ITEM", payload: { item, price } });
			}}
			
		>
			<img src={icon} alt={`${item.type_} icon`} title={tooltip} />
			<span>{price}</span>
			{/* <span>{text}</span> */}
		</button>
	);
}

export default function Store({
	resources,
}: {
	resources: ResourceCollection;
}) {
	return (
		<div id="store" >
			<div id="action-tiles" className="substore">
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "turn" }}
					icon="src/assets/turn.svg"
					text="Rotate a road tile 90° (choose CW or CCW)"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "toll" }}
					icon="src/assets/toll.svg"
					text="Put toll on a tile"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "block" }}
					icon="src/assets/block.svg"
					text="Block a tile"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "unblock" }}
					icon="src/assets/unblock.svg"
					text="Unblock a tile"
				/>
			</div>
			<div id="road-tiles" className="substore">
				<StoreItem
					resources={resources}
					price={2}
					item={road("i", 0)}
					icon="src/assets/road-i.svg"
					text="Straight road ($2)"
				/>
				<StoreItem
					resources={resources}
					price={3}
					item={road("l", 0)}
					icon="src/assets/road-l.svg"
					text="L road ($3)"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={road("t", 0)}
					icon="src/assets/road-t.svg"
					text="T road ($5)"
				/>
				<StoreItem
					resources={resources}
					price={8}
					item={road("plus", 0)}
					icon="src/assets/road-plus.svg"
					text="Crossroad ($8)"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={road("plus", 0)}
					icon="src/assets/question.svg"
					// item={(n: number) => road(ROAD_TYPES[n], 0)}
					// icon={(n: number) => `src/assets/road-${ROAD_TYPES[n]}.svg`}
					text="Random ($5)"
				/>
			</div>
			<div id="production-tiles" className="substore">
				<StoreItem
					resources={resources}
					price={5}
					item={{
						type_: "production",
						production: "dollar",
						level: 1,
					}}
					icon="src/assets/dollar-1.svg"
					text="+$1 production ($5)"
				/>
				<StoreItem
					resources={resources}
					price={15}
					item={{
						type_: "production",
						production: "dollar",
						level: 2,
					}}
					icon="src/assets/dollar-2.svg"
					text="+$2 production ($15)"
				/>
				<StoreItem
					resources={resources}
					price={30}
					item={{
						type_: "production",
						production: "dollar",
						level: 3,
					}}
					icon="src/assets/dollar-3.svg"
					text="+$3 production ($30)"
				/>
			</div>
		</div>
	);
}
