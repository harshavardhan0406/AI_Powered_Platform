import { useEffect } from "react";
import { testBackend } from "./api/backendAPI";

function App() {
  useEffect(() => {
    testBackend();
  }, []);

  return <h1 className="text-center">Frontend is Running!</h1>;
}



export default App;
