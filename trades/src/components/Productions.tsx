import type { ResourceCollection } from "../logic/Game";

export default function Productions({
	productions,
}: { productions: ResourceCollection }) {
	return (
		<div id="productions">
			<div>Productions: {productions.dollar}</div>
		</div>
	);
}
