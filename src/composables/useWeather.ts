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
import { computed } from 'vue'

import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

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

export function useWeather() {
  const store = useEntitiesStore()
  const config = useConfigStore()
  const weather = computed(() => store.get(config.home.weatherEntityId))

  return computed(() => {
    const entity = weather.value
    if (!entity) return null
    const condition = conditions[entity.state] ?? { label: entity.state, icon: Cloud }
    return {
      ...condition,
      temperature: Math.round(Number(entity.attributes.temperature)),
      unit: String(entity.attributes.temperature_unit ?? '°'),
    }
  })
}
