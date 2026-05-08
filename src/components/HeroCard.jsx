import defaultHeroImage from "../assets/hero.png";

const dashboardHeroImage =
  import.meta.env.VITE_DASHBOARD_HERO_IMAGE || "/dashboard-hero.jpg";

function HeroCard({
  title = "Welcome to Dronek Smart Monitoring",
  imageSrc = dashboardHeroImage,
  imageAlt = "Jeune pousse tenue dans les mains",
}) {
  const resolvedImage = imageSrc === "/dashboard-hero.jpg" ? defaultHeroImage : imageSrc;

  return (
    <article className="dashboard-hero-card">
      <div
        className="hero-background-image"
        style={{ backgroundImage: `url(${resolvedImage})` }}
        role="img"
        aria-label={imageAlt}
      />
      <img src="/Fichier 3.png" alt="" className="hero-bg-logo-anim" aria-hidden="true" />
      <div className="dashboard-hero-overlay" />
      <div className="dashboard-hero-content">
        <div className="hero-animated-header">
          <h1 className="hero-title-anim">
            <span className="hero-word hero-word-1">Welcome to</span>
            <span className="hero-word hero-word-2">Dronek</span>
            <span className="hero-word hero-word-3">Smart</span>
            <span className="hero-word hero-word-4">Monitoring</span>
          </h1>
        </div>
      </div>
    </article>
  );
}

export default HeroCard;
