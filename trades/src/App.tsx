import "./App.css";
import Controls from "./components/Controls";
import Board from "./components/Board";
import { GlobalProvider } from "./logic/State";

function App() {
	return (
		<GlobalProvider>
			<div id="app-layout">
				<Controls />
				<div id="board-area">
					<Board />
				</div>
			</div>
		</GlobalProvider>
	);
}

export default App;
