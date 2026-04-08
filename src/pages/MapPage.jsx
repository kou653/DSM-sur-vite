import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { getProjetParcelles } from "../api/parcelles";
import { Map as MapIcon, Sprout, Building2, Maximize2, AlertCircle } from "lucide-react";

// Fix for default Leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom DivIcon for a premium look
const createCustomIcon = () => {
  return new L.DivIcon({
    html: `<div class="custom-marker"><div class="marker-pin"></div></div>`,
    className: "custom-div-icon",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
};

function parseCoordinate(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value !== "string") {
    return NaN;
  }

  return Number.parseFloat(value.trim().replace(",", "."));
}

function offsetCoordinate(lat, lng, index, total) {
  if (total <= 1) {
    return [lat, lng];
  }

  const angle = (2 * Math.PI * index) / total;
  const radius = 0.00018;
  const latOffset = Math.sin(angle) * radius;
  const lngOffset = Math.cos(angle) * radius;

  return [lat + latOffset, lng + lngOffset];
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function MapPage() {
  const { projectId } = useParams();
  const [parcelles, setParcelles] = useState([]);
  const [nonGeolocated, setNonGeolocated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([5.30966, -4.01266]); // Default center (Abidjan region)
  const [zoom, setZoom] = useState(10);

  const displayedParcelles = useMemo(() => {
    const groups = new Map();

    parcelles.forEach((parcelle) => {
      const lat = parseCoordinate(parcelle.lat);
      const lng = parseCoordinate(parcelle.lng);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return;
      }

      const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
      const group = groups.get(key) ?? [];
      group.push(parcelle);
      groups.set(key, group);
    });

    return Array.from(groups.values()).flatMap((group) =>
      group.map((parcelle, index) => {
        const baseLat = parseCoordinate(parcelle.lat);
        const baseLng = parseCoordinate(parcelle.lng);
        const [displayLat, displayLng] = offsetCoordinate(
          baseLat,
          baseLng,
          index,
          group.length
        );

        return {
          ...parcelle,
          displayLat,
          displayLng,
        };
      })
    );
  }, [parcelles]);

  useEffect(() => {
    const fetchParcelles = async () => {
      try {
        setLoading(true);
        const response = await getProjetParcelles(projectId);
        const allParcelles = response.data.parcelles || [];
        
        // Filter parcels with actual coordinates
        const withCoords = allParcelles.filter(p => 
          p.lat && p.lng && 
          parseCoordinate(p.lat) !== 0 && 
          parseCoordinate(p.lng) !== 0
        );
        
        setParcelles(withCoords);
        setNonGeolocated(allParcelles.filter(p => !withCoords.find(wc => wc.id === p.id)));

        if (withCoords.length > 0) {
          // Calculate center based on geolocated parcels only
          const lats = withCoords.map((p) => parseCoordinate(p.lat));
          const lngs = withCoords.map((p) => parseCoordinate(p.lng));
          const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
          const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
          setMapCenter([avgLat, avgLng]);
          setZoom(13);
        }
      } catch (err) {
        console.error("Error fetching map data:", err);
        setError("Impossible de charger les données cartographiques.");
      } finally {
        setLoading(false);
      }
    };

    fetchParcelles();
  }, [projectId]);

  if (loading) {
    return (
      <div className="panel panel-inline">
        <div className="flex items-center gap-3">
          <MapIcon className="animate-pulse text-accent" />
          <p>Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel panel-inline border-danger">
        <div className="flex items-center gap-3 text-danger">
          <AlertCircle />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-page-container">
      <div className="dashboard-overview-header">
        <div>
          <h1>Géolocalisation des Parcelles</h1>
          <p>
            {parcelles.length} parcelle(s) géolocalisée(s)
            {nonGeolocated.length > 0 && ` • ${nonGeolocated.length} en attente de coordonnées`}
          </p>
        </div>
      </div>

      {nonGeolocated.length > 0 && (
        <div className="panel panel-inline" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', marginBottom: '1rem', width: '100%', maxWidth: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-strong)' }}>
            <AlertCircle size={20} />
            <div>
              <p style={{ margin: 0, fontWeight: '700' }}>Attention : Certaines parcelles n'ont pas encore de coordonnées GPS.</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                Les parcelles suivantes ne sont pas affichées sur la carte : 
                <strong> {nonGeolocated.map(p => p.nom).join(', ')}</strong>.
                Rendez-vous dans l'onglet <Link to={`/dashboard/projet/${projectId}/parcelles`} style={{ textDecoration: 'underline', color: 'inherit' }}>Parcelles</Link> pour les mettre à jour.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="map-card">
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          scrollWheelZoom={true}
          className="leaflet-container"
        >
          <ChangeView center={mapCenter} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {displayedParcelles.map((parcelle) => (
            <Marker
              key={parcelle.id}
              position={[parcelle.displayLat, parcelle.displayLng]}
              icon={createCustomIcon()}
            >
              <Popup>
                <div className="map-popup-header">
                  <h4>{parcelle.nom}</h4>
                </div>
                <div className="map-popup-body">
                  <div className="map-popup-row">
                    <span>Ville</span>
                    <span>{parcelle.ville}</span>
                  </div>
                  <div className="map-popup-row">
                    <span>Coopérative</span>
                    <span>{parcelle.cooperative?.nom || "N/A"}</span>
                  </div>
                  <div className="map-popup-row">
                    <span>Superficie</span>
                    <span>{parcelle.superficie} ha</span>
                  </div>
                  <div className="map-popup-row">
                    <span>Objectif</span>
                    <span>{parcelle.objectif || 0} plants</span>
                  </div>
                  <div className="map-popup-row">
                    <span>Progression</span>
                    <span>{parcelle.plants_count || 0} / {parcelle.objectif || 0}</span>
                  </div>
                </div>
                <Link
                  to={`/dashboard/projet/${projectId}/parcelles/${parcelle.id}`}
                  className="map-popup-link"
                >
                  <Maximize2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Voir la fiche détaillée
                </Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPage;
