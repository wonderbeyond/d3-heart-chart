<template>
  <div class="container">
      <svg class="chart container" :width="fullWidth" :height="fullHeight">
          <g class="zoomer" :transform="`translate(${fullWidth - 100}, ${margin.top})`"></g>
          <g class="main">
              <g class="zoomable-view"></g>
          </g>
      </svg>
  </div>
</template>

<script>
import Vue from 'vue';
import {min, max, range} from 'd3-array';
import {
    select as d3Select,
    mouse as d3Mouse,
    event as d3Event,
} from 'd3-selection';
import 'd3-selection-multi';
import {scaleLinear as d3ScaleLinear} from 'd3-scale';
import {axisLeft as d3AxisLeft, axisBottom as d3AxisBottom} from 'd3-axis';
import {line as d3Line} from 'd3-shape';
import {drag as d3Drag} from 'd3-drag';

export default {
    data() {
        return {
            fullWidth: 800,
            fullHeight: 360,
            margin: {
                top: 40,
                right: 60,
                bottom: 40,
                left: 30,
            },
            course: {
                name: '',
                units: [],
            },
            activities: [],
            timeSeries: [],
            intensitySeries: [],
            lineDots: [],
        };
    },
    computed: {
        maxIntensity() {
            return max(this.intensitySeries);
        },
        maxIntensityActivities() {
            return this.activities.filter(d => d.intensity == this.maxIntensity);
        },
        softWidth() {
            return this.fullWidth - this.margin.left - this.margin.right;
        },
        softHeight() {
            return this.fullHeight - this.margin.top - this.margin.bottom;
        }
    },
    watch: {
        course() {
            this.digestData();
            Vue.nextTick(() => {
                this.draw();
            });
        }
    },
    created() {
        this.course = require('./course-test-data.json');
    },
    methods: {
        digestData() {
            console.info('Digesting data');
            this.activities = [];
            this.timeSeries = [];
            this.intensitySeries = [];
            this.lineDots = [];

            var durationCnt = 0;
            this.course.units.forEach(unit => {
                unit.start = durationCnt;
                unit.activities.forEach(activity => {
                    activity.start = durationCnt;
                    this.activities.push(activity);
                    this.lineDots.push([durationCnt, activity.intensity]);
                    durationCnt += activity.duration;
                    activity.end = durationCnt;
                    unit.end = durationCnt;
                    this.timeSeries.push(activity.start, activity.end);
                    this.intensitySeries.push(activity.intensity, activity.intensity);
                });
            });
            this.timeSeries.push(durationCnt);
            this.intensitySeries.push(0);
        },
        draw() {
            const xAxisMainFontSize = 16;
            const xAxisMainTextDistance = 36;

            const yAxisMainFontSize = 16;
            const yAxisMainTextDistance = 20;

            const unitIndicatorHeight = 40;

            const dotNoteFontSize = 14;

            // Drawing svg container
            var container = d3Select(this.$el).select('svg.chart.container');
            var zoomer = container.select('.zoomer')
            zoomer.append('svg:line')
                .attrs({
                    class: 'zoomer-line',
                    x1: 0,
                    x2: 100,
                    y1: 0, y2: 0,
                });
            var drag = d3Drag()
                .on('drag', function() {
                    this.x = (this.x || 0) + d3Event.dx;
                    this.y = (this.y || 0);
                    d3Select(this).attr('transform', function(){
                        return `translate(${this.x}, ${this.y})`;
                    });
                });
            zoomer.append('svg:circle')
                .attrs({
                    class: 'zoomer-cursor'
                }).call(drag);

            var main = container.select('.main')
                .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
                .attr('class', 'main')
                .attr('width', this.softWidth)
                .attr('height', this.softHeight);
            var gZoomable = main.select('g.zoomable-view');

            var timeScale = d3ScaleLinear()
                .domain([0, max(this.timeSeries) + 10])
                .range([0, this.softWidth]);
            var timeAxis = d3AxisBottom(timeScale);
            timeAxis.tickValues(range(this.activities[0].start,
                                         this.activities.slice(-1)[0].end + 0.001,
                                         10));
            timeAxis.tickFormat((d) => this.timeSeries.indexOf(d) >= 0?
                                        d : '');

            var intensityScale = d3ScaleLinear()
                .domain([0, max(this.intensitySeries) + 1])
                .range([this.softHeight, 0]);

            var intensityAxis = d3AxisLeft(intensityScale);

            // Drawing X axis
            gZoomable.append('svg:g')
                .attr('transform', `translate(0, ${this.softHeight})`)
                .attr('class', 'time axis')
                .call(timeAxis);
            gZoomable.append('svg:text')
                .attr('class', 'x-axis-text main')
                .attr('x', this.softWidth + xAxisMainTextDistance)
                .attr('y', this.softHeight)
                .attr('font-size', xAxisMainFontSize)
                .text('时间');
            gZoomable.append('svg:text')
                .attr('class', 'x-axis-text second')
                .attr('x', this.softWidth + xAxisMainTextDistance)
                .attr('y', this.softHeight + xAxisMainFontSize)
                .attr('font-size', xAxisMainFontSize * 0.6)
                .text('（分钟）');

            // Drawing course unit indicator
            var gUnitIndicator = gZoomable.append('svg:g')
                .attr('class', 'course-unit-indicator')
                .attr('transform', `translate(0, ${this.softHeight + 20})`);
            var gUnitSection = gUnitIndicator
                .selectAll('unit')
                .data(this.course.units)
                .enter()
                .append('svg:g').attr('class', 'unit');
            gUnitSection.append('svg:line')
                .attrs({
                    class: 'area-line',
                    x1: d => timeScale(d.start),
                    y1: unitIndicatorHeight/2,
                    x2: d => timeScale(d.end),
                    y2: unitIndicatorHeight/2,
                });
            var unitNameBBoxes = [];
            var gUnitNameText = gUnitSection.append('svg:text')
                .attr('class', 'unit-name')
                .attr('x', d => timeScale((d.start + d.end)/2))
                .attr('y', unitIndicatorHeight/2)
                .text(d => `单元${d.id}：${d.name}`)
                .each(function() {
                    unitNameBBoxes.push(this.getBBox());
                });
            gUnitSection.insert('svg:rect', 'text')
                .attr('class', 'unit-name-border-box')
                .attr('x', (d, i) => unitNameBBoxes[i].x - 2)
                .attr('y', (d, i) => unitNameBBoxes[i].y)
                .attr('width', (d, i) => unitNameBBoxes[i].width + 4)
                .attr('height', (d, i) => unitNameBBoxes[i].height);

            var unitSepLine = d3Line();
            gUnitSection.append('svg:path')
                .attr('class', 'sep-line')
                .attr('d', (d) => {
                    return unitSepLine([
                        [timeScale(d.start), 0],
                        [timeScale(d.start), unitIndicatorHeight]
                    ]);
                });
            gUnitSection
                .filter((d, i) => {
                    return i == this.course.units.length - 1;
                })
                .append('svg:path')
                .attr('class', 'sep-line')
                .attr('d', (d) => {
                    return unitSepLine([
                        [timeScale(d.end), 0],
                        [timeScale(d.end), unitIndicatorHeight]
                    ]);
                });

            // Drawing Y axis
            main.append('svg:g')
                .attr('class', 'intensity axis')
                .call(intensityAxis);
            main.append('svg:text')
                .attr('class', 'y-axis-text')
                .attr('x', 0)
                .attr('y', -yAxisMainTextDistance)
                .attr('font-size', yAxisMainFontSize)
                .text('刺激度');

            // Drawing data line
            var line = d3Line()
                .x((d) => {
                    return timeScale(d);
                })
                .y((d, i) => {
                    return intensityScale(this.intensitySeries[i]);
                });
            gZoomable.append('svg:path')
                // .transition()
                // .delay(10)
                .attr('class', 'data-line')
                .attr('d', line(this.timeSeries));

            // Drawing track container
            // Refer to: http://stackoverflow.com/questions/16918194/d3-js-mouseover-event-not-working-properly-on-svg-group
            var trackArea = gZoomable.append('svg:g')
                .attr('class', 'track-area')
                .style('pointer-events', 'all');
            trackArea.append('svg:rect')
                .style('visibility', 'hidden')
                .attr('class', 'invisible-rectangle-as-placeholder')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', this.softWidth)
                .attr('height', this.softHeight);

            // Dots selectable
            trackArea.on('click', () => {
                var clickX = d3Mouse(trackArea.node())[0];
                var xValues = this.lineDots.map(d => timeScale(d[0]));
                var deltas = xValues.map(d => {
                    return Math.abs(clickX - d);
                });
                var closest = deltas.indexOf(min(deltas));
                console.log('Clicked:', this.activities[closest].name);
                gDots.classed('active', (d, i) => {
                    return i === closest;
                });
            })

            // Drawing line dots
            var gLineDots = gZoomable.append('svg:g')
                .attr('class', 'line-dots');

            var gDots = gLineDots.selectAll('dot')
                .data(this.lineDots)
                .enter()
                .append('svg:g')
                .attr('transform', (d) => {
                    return `translate(${timeScale(d[0])}, ${intensityScale(d[1])})`;
                })
                .attr('class', 'dot-container')
                .classed('active', (d, i) => {
                    // Activate first top value
                    return this.maxIntensityActivities[0].start == d[0];
                });
            gDots.append('svg:circle')
                .attr('class', 'line-dot')
            gDots.append('svg:text')
                .attr('class', 'dot-note')
                .attr('font-size', dotNoteFontSize)
                .attr('x', 0)    // Maybe we need moving left slightly!
                .attr('y', -5)
                .text((d, i) => {
                    var a = this.activities[i];
                    return `${a.name}/${a.intensity}`;
                });
        }
    }
};
</script>

<style>
$primary-color: #40ab56;
$dot-note-color: $primary-color;
$dot-circle-color: #349a49;
$mark-line-color: #000;
$mark-text-color: #333;

.container {
    width: 100%;
    min-height: 400px;
}

svg.chart {
    & .zoomer {
        & .zoomer-line {
            stroke: #000;
        }
        & .zoomer-cursor {
            r: 6;
            fill: #333;
        }
    }
    & .x-axis-text,
    & .y-axis-text {
        fill: $mark-text-color;
        text-anchor: middle;
    }
    & .course-unit-indicator {
        & .area-line {
            stroke: $mark-line-color;
            stroke-width: 1;
        }
        & text {
            alignment-baseline: central;
            text-anchor: middle;
            fill: $mark-text-color;
            font-size: 14px;
        }
        & .unit-name-border-box {
            /*stroke: #CCC;*/
            fill: #FFF;
            fill-opacity: 1;
        }
        & .sep-line {
            stroke: $mark-line-color;
            stroke-dasharray: 3,2;
        }
    }
    & .track-area {
        cursor: crosshair;
    }
    & .data-line {
        stroke: $primary-color;
        stroke-width: 1;
        fill: none;
    }
    & .dot-container {
        & .line-dot {
            r: 1.5;
            fill: $dot-circle-color;
        }
        &.active .line-dot {
            r: 3;
            fill: $dot-circle-color;
        }

        & .dot-note {
            visibility: hidden;
            text-anchor: start;
            fill: $dot-note-color;
            font-weight: bold;
            font-family: 'Open Sans', Arial, Helvetica, sans-serif;;
        }
        &.active .dot-note {
            visibility: visible;
        }
    }
}

@media print {
    svg.chart .dot-container .dot-note {
        visibility: visible;
    }
}
</style>
