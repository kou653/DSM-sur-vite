import defaultHeroImage from "../assets/hero.png";

const dashboardHeroImage =
  import.meta.env.VITE_DASHBOARD_HERO_IMAGE || "/dashboard-hero.jpg";

function HeroCard({
  title = "Restauration des ecosystemes locaux",
  imageSrc = dashboardHeroImage,
  imageAlt = "Jeune pousse tenue dans les mains",
}) {
  const resolvedImage = imageSrc === "/dashboard-hero.jpg" ? defaultHeroImage : imageSrc;

  return (
    <article className="dashboard-hero-card">
      <img src={resolvedImage} alt={imageAlt} />
      <div className="dashboard-hero-overlay" />
      <div className="dashboard-hero-content">
        <span>{title}</span>
      </div>
    </article>
  );
}

export default HeroCard;
