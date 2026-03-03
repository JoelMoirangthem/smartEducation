import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div>
      <h1>My App</h1>
      <hr />
      <Outlet />
    </div>
  );
}

export default MainLayout;
 