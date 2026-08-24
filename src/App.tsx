import { useHookyState } from "./hooks/useHookyState";
import { PetAvatar } from "./components/Avatar";
import "./App.css";

function App() {
  const state = useHookyState();
  return <PetAvatar animation={state} />;
}

export default App;
