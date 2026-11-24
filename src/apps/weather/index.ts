import { type AppOf, defineAppType } from '@/kit/define'

/** The forecast of kiosk.yaml's top-level `weather:` entity. Write just `weather` on the dashboard. */
const weather = defineAppType({
  type: 'weather',
  description: "The weather of kiosk.yaml's top-level `weather:` entity.",
  icon: 'cloud-sun',
  entities: {},
  finish: (app, context) => ({ ...app, weatherEntityId: context.weather }),
  widget: {
    widgetScreen: () => import('./WeatherWidget.vue'),
    sizes: ['1x1', '2x1'],
    complication: true,
    check: (app) =>
      app.weatherEntityId
        ? undefined
        : 'needs `weather:` (a weather.* entity) at the top of kiosk.yaml',
  },
  // The weather entity is mocked with the rest of kiosk.yaml's top level (ha/mock/fixtures.ts).
  mock: () => [],
})

export default weather
export type WeatherApp = AppOf<typeof weather>
