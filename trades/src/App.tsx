import "./App.css";
import Board from "./components/Board";
import Controls from "./components/Controls";
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
		</GlobalProvider>
	);
}

export default App;
