import "./App.css";
import Board from "./components/Board";
import Controls from "./components/Controls";
import EventCardOverlay from "./components/EventCardOverlay";
import EventDeck from "./components/EventDeck";
import PlayerBalances from "./components/PlayerBalances";
import { GlobalProvider } from "./logic/State";

function App() {
	return (
		<GlobalProvider>
			<div id="app-layout">
				<Controls />
				<div id="board-area">
					<Board />
				</div>
				<PlayerBalances />
			</div>
			<EventDeck />
			<EventCardOverlay />
		</GlobalProvider>
	);
}

export default App;
