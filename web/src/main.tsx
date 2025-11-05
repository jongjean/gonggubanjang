import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Landing from "./pages/Landing";
import Tools from "./pages/Tools";
import AvailableTools from "./pages/AvailableTools";
import ToolEditor from "./pages/ToolEditor";
import MyLoans from "./pages/MyLoans";
import CaptureTool from "./pages/CaptureTool";
import Settings from "./pages/Settings";
import IncidentStatus from "./pages/IncidentStatus";
import History from "./pages/History";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/available-tools" element={<AvailableTools />} />
        <Route path="/tool-editor" element={<ToolEditor />} />
        <Route path="/my-loans" element={<MyLoans />} />
        <Route path="/capture" element={<CaptureTool />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/incidents" element={<IncidentStatus />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
