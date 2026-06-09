/*
*******************************************************************
components/EChartsLoader.ts

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
*/
// Dynamic ECharts loader for better performance
import { defineAsyncComponent } from 'vue'
import EChartsLoading from './EChartsLoading.vue'
import EChartsError from './EChartsError.vue'

// Lazy load ECharts components only when needed
export const VChart = defineAsyncComponent({
  loader: async () => {
    // Dynamic imports for tree-shaking
    const [
      { use },
      { CanvasRenderer },
      { LineChart, BarChart, PieChart },
      {
        TitleComponent,
        TooltipComponent,
        LegendComponent,
        GridComponent,
        DataZoomComponent,
        ToolboxComponent
      },
      VChartComponent
    ] = await Promise.all([
      import('echarts/core'),
      import('echarts/renderers'),
      import('echarts/charts'),
      import('echarts/components'),
      import('vue-echarts')
    ])

    // Register components
    use([
      CanvasRenderer,
      LineChart,
      BarChart,
      PieChart,
      TitleComponent,
      TooltipComponent,
      LegendComponent,
      GridComponent,
      DataZoomComponent,
      ToolboxComponent
    ])

    return VChartComponent.default
  },
  loadingComponent: EChartsLoading,
  errorComponent: EChartsError,
  delay: 100,
  timeout: 10000
})
