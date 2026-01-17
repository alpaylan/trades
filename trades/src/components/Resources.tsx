import type { ResourceCollection } from "../logic/Game";

export default function Resources({
	resources,
}: { resources: ResourceCollection }) {
	return <div id="resources">${resources.dollar}</div>;
}
