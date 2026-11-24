import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Wind,
  type LucideIcon,
} from '@lucide/vue'
import { computed, type MaybeRefOrGetter } from 'vue'

import { useEntity } from '@/kit'

const conditions: Record<string, { label: string; icon: LucideIcon }> = {
  'clear-night': { label: 'Clear', icon: Moon },
  cloudy: { label: 'Cloudy', icon: Cloud },
  exceptional: { label: 'Unusual', icon: Cloud },
  fog: { label: 'Fog', icon: CloudFog },
  hail: { label: 'Hail', icon: CloudSnow },
  lightning: { label: 'Thunder', icon: CloudLightning },
  'lightning-rainy': { label: 'Thunderstorm', icon: CloudLightning },
  partlycloudy: { label: 'Partly cloudy', icon: CloudSun },
  pouring: { label: 'Heavy rain', icon: CloudRain },
  rainy: { label: 'Rain', icon: CloudRain },
  snowy: { label: 'Snow', icon: CloudSnow },
  'snowy-rainy': { label: 'Sleet', icon: CloudSnow },
  sunny: { label: 'Sunny', icon: Sun },
  windy: { label: 'Windy', icon: Wind },
  'windy-variant': { label: 'Windy', icon: Wind },
}

/** A weather.* entity as an icon, a rounded temperature and a label. Null while unknown. */
export function useWeather(entityId: MaybeRefOrGetter<string | undefined>) {
  const weather = useEntity(entityId)

  return computed(() => {
    const entity = weather.value
    if (!entity) return null
    const condition = conditions[entity.state] ?? { label: entity.state, icon: Cloud }
    const { humidity, wind_speed: wind, wind_speed_unit: windUnit } = entity.attributes
    return {
      ...condition,
      temperature: Math.round(Number(entity.attributes.temperature)),
      unit: String(entity.attributes.temperature_unit ?? '°'),
      detail: [
        humidity !== undefined && `Humidity ${String(humidity)}%`,
        wind !== undefined && `Wind ${String(wind)} ${String(windUnit ?? '')}`.trim(),
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })
}
