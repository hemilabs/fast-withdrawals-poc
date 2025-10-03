import { Bridge } from "components/bridge";
import { Header } from "components/header";
import { Pools } from "components/pools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";

export const App = () => (
  <div className="flex h-screen flex-col">
    <div id="app-layout-container" />
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/bridge" replace />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/pools" element={<Pools />} />
      </Routes>
    </BrowserRouter>
  </div>
);
