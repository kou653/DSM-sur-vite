import { Outlet } from "react-router-dom";

function ProjectLayout() {
  return (
    <section className="project-content">
      <Outlet />
    </section>
  );
}

export default ProjectLayout;
