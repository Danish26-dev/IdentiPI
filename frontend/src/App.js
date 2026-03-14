import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import IdentiPILanding from "@/IdentiPILanding";
import Login from "@/pages/Login";
import UpdatedUserDashboard from "@/pages/UpdatedUserDashboard";
import UpdatedVerifierDashboard from "@/pages/UpdatedVerifierDashboard";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IdentiPILanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/user" element={<UpdatedUserDashboard />} />
          <Route path="/dashboard/verifier" element={<UpdatedVerifierDashboard />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
