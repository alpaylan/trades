/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	type Dispatch,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	AUTHORITATIVE_ACTION_TYPES,
	type Action,
	initialState,
	reducer,
	type State,
	UI_ONLY_ACTION_TYPES,
} from "./engine";

type MultiplayerBridge = {
	sendAuthoritativeAction: (action: Action) => void;
	authoritativeState: State | null;
};

type GlobalContextType = {
	state: State;
	dispatch: Dispatch<Action>;
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({
	children,
	multiplayer,
}: {
	children: ReactNode;
	multiplayer?: MultiplayerBridge;
}) => {
	const [state, setState] = useState<State>(() => initialState());

	useEffect(() => {
		if (!multiplayer?.authoritativeState) {
			return;
		}
		setState(multiplayer.authoritativeState);
	}, [multiplayer?.authoritativeState]);

	const dispatch = useCallback<Dispatch<Action>>(
		(action) => {
			if (!multiplayer) {
				setState((previous) => reducer(previous, action));
				return;
			}
			if (UI_ONLY_ACTION_TYPES.includes(action.type) || action.type === "UNDO") {
				setState((previous) => reducer(previous, action));
				return;
			}
			if (AUTHORITATIVE_ACTION_TYPES.includes(action.type)) {
				multiplayer.sendAuthoritativeAction(action);
				return;
			}
			setState((previous) => reducer(previous, action));
		},
		[multiplayer],
	);

	const value = useMemo(
		() => ({
			state,
			dispatch,
		}),
		[state, dispatch],
	);

	return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => {
	const context = useContext(GlobalContext);
	if (!context) {
		throw new Error("useGlobalContext must be used within a GlobalProvider");
	}
	return context;
};
