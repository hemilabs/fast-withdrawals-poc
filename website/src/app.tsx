import { Bridge } from "components/bridge";

export const App = () => (
  <div className="flex h-screen flex-col">
    <div id="app-layout-container" />
    <main className="my-auto justify-self-center">
      <Bridge />
    </main>
  </div>
);
