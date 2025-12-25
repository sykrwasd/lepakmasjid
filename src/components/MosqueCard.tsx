import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Mosque } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useLanguageStore } from '@/stores/language';
import * as LucideIcons from 'lucide-react';

interface MosqueCardProps {
  mosque: Mosque;
  onClick?: () => void;
}

const MosqueCard = ({ mosque, onClick }: MosqueCardProps) => {
  const { language } = useLanguageStore();
  
  const displayName = language === 'bm' && mosque.name_bm ? mosque.name_bm : mosque.name;
  const displayDescription = language === 'bm' && mosque.description_bm 
    ? mosque.description_bm 
    : mosque.description;

  // Get icon component dynamically
  // Convert icon name to PascalCase and handle special cases
  const getIcon = (iconName: string) => {
    if (!iconName) return MapPin;
    
    // Normalize the icon name (lowercase, handle hyphens)
    const normalized = iconName.toLowerCase().trim();
    
    // Map lowercase icon names from seed data to Lucide React icon names
    const iconMap: Record<string, string> = {
      'wifi': 'Wifi',
      'laptop': 'Laptop',
      'book': 'BookOpen',
      'accessibility': 'Accessibility',
      'car': 'Car',
      'droplet': 'Droplet',
      'users': 'Users',
      'wind': 'Wind',
      'utensils': 'UtensilsCrossed',
      'graduation-cap': 'GraduationCap',
      'graduationcap': 'GraduationCap',
    };
    
    // Get the mapped icon name
    const mappedName = iconMap[normalized];
    
    // Try to get the icon component
    const IconComponent = mappedName 
      ? ((LucideIcons as any)[mappedName] || MapPin)
      : MapPin;
    
    return IconComponent;
  };

  // Combine regular amenities and custom amenities
  const allAmenities = [
    ...(mosque.amenities || []).map(amenity => ({
      id: amenity.id,
      label: language === 'bm' ? amenity.label_bm : amenity.label_en,
      icon: amenity.icon,
      isCustom: false,
    })),
    ...(mosque.customAmenities || []).map(customAmenity => ({
      id: customAmenity.id,
      label: language === 'bm' 
        ? (customAmenity.details.custom_name || 'Custom Amenity')
        : (customAmenity.details.custom_name_en || 'Custom Amenity'),
      icon: customAmenity.details.custom_icon || 'MapPin',
      isCustom: true,
    })),
  ];

  return (
    <Link to={`/mosque/${mosque.id}`} onClick={onClick}>
      <article
        className="card-elevated p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1"
        role="button"
        tabIndex={0}
        aria-label={`View details for ${displayName}`}
      >
        {/* Image placeholder with gradient */}
        <div className="relative h-40 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </div>
          {/* State badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm"
          >
            {mosque.state.replace('Wilayah Persekutuan ', 'WP ')}
          </Badge>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {mosque.address}
            </p>
          </div>

          {/* Description */}
          {displayDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {displayDescription}
            </p>
          )}

          {/* Amenities */}
          {allAmenities.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {allAmenities.map((amenity) => {
                const IconComponent = getIcon(amenity.icon);
                return (
                  <Badge
                    key={amenity.id}
                    variant="secondary"
                    className="bg-muted text-muted-foreground font-normal px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span className="text-xs">{amenity.label}</span>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
};

export default MosqueCard;
