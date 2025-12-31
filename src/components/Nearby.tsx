import { useEffect, useState } from "react";
import {
  UtensilsCrossed,
  ShoppingBag,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface NearbyProps {
  longitude: number;
  latitude: number;
}

interface Place {
  id: number;
  type: "restaurant" | "mall";
  name: string;
  lat: number;
  lng: number;
}

interface RawPlace {
  id: number;
  type: "restaurant" | "mall" | "unknown";
  name: string;
  lat: number;
  lng: number;
}

const Nearby: React.FC<NearbyProps> = ({ longitude, latitude }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRestaurants, setShowAllRestaurants] = useState(false);
  const [showAllMalls, setShowAllMalls] = useState(false);

  useEffect(() => {
    const fetchOSM = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const url = `https://overpass-api.de/api/interpreter?data=
          [out:json];
          (
            node["amenity"="restaurant"]["diet:halal"="yes"](around:5000,${latitude},${longitude});
            node["amenity"="restaurant"]["halal"="yes"](around:5000,${latitude},${longitude});
            node["shop"="mall"](around:5000,${latitude},${longitude});
          );
          out center tags;
        `;

        const res = await fetch(url);
        const data = await res.json();

        const fetchedPlaces: RawPlace[] = data.elements.map((el: any) => {
          const tags = el.tags || {};
          return {
            id: el.id,
            type:
              tags.amenity === "restaurant"
                ? "restaurant"
                : tags.shop === "mall"
                  ? "mall"
                  : "unknown",
            name: tags.name ?? "Unnamed",
            lat: el.lat ?? el.center?.lat,
            lng: el.lon ?? el.center?.lon,
          };
        });

        setPlaces(
          fetchedPlaces.filter((p): p is Place => p.type !== "unknown")
        );
      } catch (err) {
        setError("Failed to load nearby places");
        console.error("Error fetching nearby places:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (longitude && latitude) {
      fetchOSM();
    }
  }, [longitude, latitude]);

  const restaurants = places.filter((p) => p.type === "restaurant");
  const malls = places.filter((p) => p.type === "mall");

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl">Nearby Places</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl">Nearby Places</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Nearby Places
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[400px] overflow-y-auto">
        {/* Halal Restaurants */}
        {restaurants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Halal Restaurants</h3>
              <Badge variant="secondary" className="ml-auto">
                {restaurants.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {(showAllRestaurants ? restaurants : restaurants.slice(0, 5)).map(
                (restaurant) => (
                  <div
                    key={restaurant.id}
                    className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <p className="text-sm font-medium mb-2">{restaurant.name}</p>
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`;
                        window.open(url, "_blank");
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:underline transition-all"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Open in Google Maps</span>
                    </button>
                  </div>
                )
              )}
              {restaurants.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllRestaurants(!showAllRestaurants)}
                  className="w-full text-xs"
                >
                  {showAllRestaurants ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      See All ({restaurants.length - 5} more)
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Shopping Malls */}
        {malls.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Shopping Malls</h3>
              <Badge variant="secondary" className="ml-auto">
                {malls.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {(showAllMalls ? malls : malls.slice(0, 5)).map((mall) => (
                <div
                  key={mall.id}
                  className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <p className="text-sm font-medium mb-2">{mall.name}</p>
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${mall.lat},${mall.lng}`;
                      window.open(url, "_blank");
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline transition-all"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Open in Google Maps</span>
                  </button>
                </div>
              ))}
              {malls.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMalls(!showAllMalls)}
                  className="w-full text-xs"
                >
                  {showAllMalls ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      See All ({malls.length - 5} more)
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {places.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No nearby places found
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default Nearby;
