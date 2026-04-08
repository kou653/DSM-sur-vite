import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { AlertCircle, LocateFixed, Map as MapIcon, Maximize2, Route } from "lucide-react";
import { getProjetParcelles } from "../api/parcelles";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const createCustomIcon = () =>
  new L.DivIcon({
    html: `<div class="custom-marker"><div class="marker-pin"></div></div>`,
    className: "custom-div-icon",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });

const createUserIcon = () =>
  new L.DivIcon({
    html: `<div class="custom-marker custom-marker-user"><div class="marker-pin marker-pin-user"></div></div>`,
    className: "custom-div-icon",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });

const COTE_DIVOIRE_CENTER = [7.54, -5.55];
const COTE_DIVOIRE_BOUNDS = [
  [4.2, -8.7],
  [10.8, -2.3],
];

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
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [routeTarget, setRouteTarget] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapCenter, setMapCenter] = useState(COTE_DIVOIRE_CENTER);
  const [zoom, setZoom] = useState(7);
  const watchIdRef = useRef(null);
  const routeDebounceRef = useRef(null);

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

        const withCoords = allParcelles.filter((parcelle) => {
          const lat = parseCoordinate(parcelle.lat);
          const lng = parseCoordinate(parcelle.lng);

          return (
            !Number.isNaN(lat) &&
            !Number.isNaN(lng) &&
            lat !== 0 &&
            lng !== 0
          );
        });

        setParcelles(withCoords);
        setNonGeolocated(
          allParcelles.filter(
            (parcelle) => !withCoords.some((withCoord) => withCoord.id === parcelle.id)
          )
        );

        if (withCoords.length > 0) {
          const lats = withCoords.map((parcelle) => parseCoordinate(parcelle.lat));
          const lngs = withCoords.map((parcelle) => parseCoordinate(parcelle.lng));
          const avgLat = lats.reduce((sum, value) => sum + value, 0) / lats.length;
          const avgLng = lngs.reduce((sum, value) => sum + value, 0) / lngs.length;
          setMapCenter([avgLat, avgLng]);
          setZoom(13);
        }
      } catch (fetchError) {
        console.error("Error fetching map data:", fetchError);
        setError("Impossible de charger les donnees cartographiques.");
      } finally {
        setLoading(false);
      }
    };

    fetchParcelles();
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (routeDebounceRef.current) {
        clearTimeout(routeDebounceRef.current);
      }
    };
  }, []);

  async function getCurrentPosition() {
    if (!navigator.geolocation) {
      throw new Error("La geolocalisation n'est pas prise en charge par ce navigateur.");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve([position.coords.latitude, position.coords.longitude]),
        () => reject(new Error("Impossible de recuperer votre position actuelle.")),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  function startWatchingUserPosition() {
    if (!navigator.geolocation || watchIdRef.current !== null) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setLocationError("Le suivi de position en temps reel a echoue.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }

  async function fetchRoute(origin, destination) {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`
    );

    if (!response.ok) {
      throw new Error("Impossible de calculer l'itineraire pour le moment.");
    }

    const data = await response.json();
    const coordinates =
      data.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) ?? [];

    if (coordinates.length === 0) {
      throw new Error("Aucun itineraire routier n'a ete trouve.");
    }

    setRouteCoordinates(coordinates);
  }

  async function locateUser() {
    setIsLocating(true);
    setLocationError("");

    try {
      const nextPosition = await getCurrentPosition();
      setUserPosition(nextPosition);
      setMapCenter(nextPosition);
      setZoom(15);
      startWatchingUserPosition();
    } catch (locateError) {
      setLocationError(locateError.message);
    } finally {
      setIsLocating(false);
    }
  }

  async function buildRoute(parcelle) {
    setLocationError("");

    try {
      const destination = [parseCoordinate(parcelle.lat), parseCoordinate(parcelle.lng)];

      if (destination.some((value) => Number.isNaN(value))) {
        throw new Error("Les coordonnees de cette parcelle sont invalides.");
      }

      if (!userPosition) {
        const origin = await getCurrentPosition();
        setUserPosition(origin);
        setMapCenter(origin);
      }

      setRouteTarget({
        id: parcelle.id,
        lat: destination[0],
        lng: destination[1],
      });
      setMapCenter(destination);
      setZoom(14);
      startWatchingUserPosition();
    } catch (routeError) {
      setLocationError(routeError.message);
      setRouteTarget(null);
      setRouteCoordinates([]);
    }
  }

  function clearRoute() {
    setRouteTarget(null);
    setRouteCoordinates([]);
  }

  useEffect(() => {
    if (!routeTarget || !userPosition) {
      return;
    }

    if (routeDebounceRef.current) {
      clearTimeout(routeDebounceRef.current);
    }

    routeDebounceRef.current = setTimeout(async () => {
      setIsRouting(true);

      try {
        await fetchRoute(userPosition, [routeTarget.lat, routeTarget.lng]);
      } catch (routeError) {
        setLocationError(routeError.message);
      } finally {
        setIsRouting(false);
      }
    }, 800);

    return () => {
      if (routeDebounceRef.current) {
        clearTimeout(routeDebounceRef.current);
      }
    };
  }, [routeTarget, userPosition]);

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
          <h1>Geolocalisation des Parcelles</h1>
          <p>
            {parcelles.length} parcelle(s) geolocalisee(s)
            {nonGeolocated.length > 0 ? ` • ${nonGeolocated.length} en attente de coordonnees` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="dashboard-add-button"
            onClick={locateUser}
            disabled={isLocating}
          >
            <LocateFixed size={14} />
            {isLocating ? "Localisation..." : "Ma position"}
          </button>
          {routeCoordinates.length > 0 ? (
            <button type="button" className="secondary-action" onClick={clearRoute}>
              Effacer l'itineraire
            </button>
          ) : null}
        </div>
      </div>

      {locationError ? <p className="form-error">{locationError}</p> : null}

      {nonGeolocated.length > 0 ? (
        <div
          className="panel panel-inline"
          style={{
            background: "var(--accent-soft)",
            borderColor: "var(--accent)",
            marginBottom: "1rem",
            width: "100%",
            maxWidth: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--accent-strong)",
            }}
          >
            <AlertCircle size={20} />
            <div>
              <p style={{ margin: 0, fontWeight: "700" }}>
                Certaines parcelles n'ont pas encore de coordonnees GPS.
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
                Non affichees sur la carte :
                <strong> {nonGeolocated.map((parcelle) => parcelle.nom).join(", ")}</strong>.
                Mettre a jour dans{" "}
                <Link
                  to={`/dashboard/projet/${projectId}/parcelles`}
                  style={{ textDecoration: "underline", color: "inherit" }}
                >
                  Parcelles
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="map-card">
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          scrollWheelZoom
          className="leaflet-container"
          maxBounds={COTE_DIVOIRE_BOUNDS}
          maxBoundsViscosity={1}
          minZoom={7}
          maxZoom={18}
        >
          <ChangeView center={mapCenter} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userPosition ? (
            <Marker position={userPosition} icon={createUserIcon()}>
              <Popup>
                <strong>Votre position actuelle</strong>
              </Popup>
            </Marker>
          ) : null}
          {routeCoordinates.length > 0 ? (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: "#1d4ed8", weight: 5, opacity: 0.85 }}
            />
          ) : null}
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
                    <span>Cooperative</span>
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
                    <span>
                      {parcelle.plants_count || 0} / {parcelle.objectif || 0}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/dashboard/projet/${projectId}/parcelles/${parcelle.id}`}
                  className="map-popup-link"
                >
                  <Maximize2
                    size={14}
                    style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }}
                  />
                  Voir la fiche detaillee
                </Link>
                <button
                  type="button"
                  className="map-popup-link"
                  style={{
                    width: "100%",
                    border: 0,
                    borderTop: "1px solid #eee",
                    background:
                      routeTarget?.id === parcelle.id ? "#eef4ff" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => buildRoute(parcelle)}
                  disabled={isRouting}
                >
                  <Route
                    size={14}
                    style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }}
                  />
                  {routeTarget?.id === parcelle.id && routeCoordinates.length > 0
                    ? "Itineraire affiche"
                    : isRouting
                      ? "Calcul..."
                      : "Itineraire jusqu'ici"}
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPage;
