import { useHookyState } from "./hooks/useHookyState";
import { PetAvatar } from "./components/PetAvatar";
import "./App.css";

function App() {
  const state = useHookyState();
  return <PetAvatar animation={state} />;
}

export default App;
