
import * as echarts from 'echarts/core';

import { BarChart,PieChart,LineChart,GaugeChart} from 'echarts/charts';
// Import the title, tooltip, grid, dataset, and built-in data-transform components; component names end in `Component`.
import {
    TooltipComponent,
    GridComponent,
} from 'echarts/components';
// Import features such as automatic label layout and universal transitions.
// Import the Canvas renderer. Either CanvasRenderer or SVGRenderer is required.
import { CanvasRenderer } from 'echarts/renderers';
import { LegendComponent } from 'echarts/components';
// Register the required components.
echarts.use([
    GaugeChart,
    LegendComponent,
    PieChart,
    TooltipComponent,
    GridComponent,
    BarChart,
    LineChart,
    CanvasRenderer
]);

export default echarts
