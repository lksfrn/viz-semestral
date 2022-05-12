import { useEffect, useState } from "react";
import TheMap from "./components/TheMap";

function App() {
  const [data, setData] = useState<any>(null);

  // fetch data
  useEffect(() => {
    fetch("/data/miserables.json")
      .then((res) => res.json())
      .then((res) => {
        setData(res);
      });
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <main style={{height: '100vh'}}>
      <TheMap data={data} />
    </main>
  );
}

export default App;
