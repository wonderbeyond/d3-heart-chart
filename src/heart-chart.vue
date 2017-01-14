<template>
<div class="container">
    <svg class="chart container" :width="fullWidth" :height="fullHeight">
        <g class="zoomer" :transform="`translate(${fullWidth - 100}, ${margin.top})`">
              <line class="zoomer-line" x1="0" x2="100" y1="0" y2="0"></line>
              <circle class="zoomer-cursor"></circle>
        </g>
        <g class="main" :transform="`translate(${margin.left}, ${margin.top})`"
              :width="softWidth" :height="softHeight">
            <g class="zoomable-view">
                <!-- <g class="time axis" :transform="`translate(0, ${softHeight})`"></g> -->
                <time-axis class="time axis"
                    :transform="`translate(0, ${softHeight})`"
                    :tick-values="timeTickValues"
                    :scale="timeScale">
                </time-axis>
                <text class="x-axis-text main"
                    :font-size="settings.xAxisMainFontSize"
                    :x="softWidth + settings.xAxisMainTextDistance"
                    :y="softHeight">时间
                </text>
                <text class="x-axis-text second"
                    :font-size="settings.xAxisMainFontSize * 0.6"
                    :x="softWidth + settings.xAxisMainTextDistance"
                    :y="softHeight + settings.xAxisMainFontSize">（分钟）
                </text>
                <g class="course-unit-indicator"
                    :transform="`translate(0, ${softHeight + 20})`">
                    <g v-for="(unit, index) in course.units" class="unit">
                        <line class="area-line"
                            :x1="timeScale(unit.start)"
                            :x2="timeScale(unit.end)"
                            :y1="settings.unitIndicatorHeight/2"
                            :y2="settings.unitIndicatorHeight/2">
                        </line>
                        <boxed-text class="unit-name"
                            :x="timeScale((unit.start+unit.end)/2)"
                            :y="settings.unitIndicatorHeight/2">
                            {{unit.name}}
                        </boxed-text>
                        <path class="sep-line"
                            :d="genUnitSepLineCmd({unit: unit})">
                        </path>
                        <path class="sep-line" v-if="index == (course.units.length - 1)"
                            :d="genUnitSepLineCmd({unit: unit, side: 'right'})">
                        </path>
                    </g>
                </g>
            </g>
        </g>
    </svg>
</div>
</template>

<script>
import Vue from 'vue';
import {min, max, merge, range} from 'd3-array';
import {set} from 'd3-collection';
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
import boxedText from 'components/boxed-text.vue';
import timeAxis from 'components/time-axis.vue';

export default {
    components: {
        'boxed-text': boxedText,
        'time-axis': timeAxis,
    },
    data() {
        return {
            settings: {
                xAxisMainFontSize: 16,
                xAxisMainTextDistance: 36,
                yAxisMainFontSize: 16,
                yAxisMainTextDistance: 20,
                unitIndicatorHeight: 40,
                dotNoteFontSize: 14,
            },
            fullWidth: 700,
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
            transformOptions: {
                zoomRate: 1,
                showTickStart: 0,
                showTickCount: null,
                showTicks: null,
            },
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
        },
        timeScale() {
            return d3ScaleLinear().domain([0, max(this.timeSeries) + 10])
                .range([0, this.softWidth]);
        },
        intensityScale() {
            return d3ScaleLinear()
                .domain([0, max(this.intensitySeries) + 1])
                .range([this.softHeight, 0]);
        },
        timeTickValues() {
            return set(merge([
                this.timeSeries,
            ])).values();
        },
    },
    watch: {
        course() {
            Vue.nextTick(() => this.draw());
        },
        transformOptions: {
            deep: true,
            handler: function () {
                Vue.nextTick(() => this.draw());
            }
        }
    },
    created() {
        var course = require('./course-test-data.json');
        // this.$http.get(`http://demo.91jianke.com:1082/api/v2.0/activity-design/cardiograph/585b8c3857dccb66705f0bed`)
        //     .then(resp => {
        //         this.course = resp.body.data;
        //     });
        this.digestData(course);
        this.course = course;
    },
    methods: {
        digestData(course) {
            console.info('Digesting data');
            this.activities = [];
            this.timeSeries = [];
            this.intensitySeries = [];
            this.lineDots = [];

            var durationCnt = 0;
            course.units.forEach(unit => {
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
        genUnitSepLineCmd({unit, side='left'}) {
            var line = d3Line();
            var x = (side == 'left' ? unit.start : unit.end);
            return line([
                [this.timeScale(x), 0],
                [this.timeScale(x), this.settings.unitIndicatorHeight],
            ]);
        },
        draw() {
            // Drawing svg container
            var container = d3Select(this.$el).select('svg.chart.container');
            var zoomer = container.select('.zoomer');
            var drag = d3Drag()
                .on('drag', function() {
                    this.x = (this.x || 0) + d3Event.dx;
                    this.y = (this.y || 0);
                    d3Select(this).attr('transform', function(){
                        return `translate(${this.x}, ${this.y})`;
                    });
                });
            zoomer.select('.zoomer-cursor').call(drag);

            var main = container.select('.main');
            var gZoomable = main.select('g.zoomable-view');

            var intensityAxis = d3AxisLeft(this.intensityScale);

            // Drawing Y axis
            main.append('svg:g')
                .attr('class', 'intensity axis')
                .call(intensityAxis);
            main.append('svg:text')
                .attr('class', 'y-axis-text')
                .attr('x', 0)
                .attr('y', -this.settings.yAxisMainTextDistance)
                .attr('font-size', this.settings.yAxisMainFontSize)
                .text('刺激度');

            // Drawing data line
            var line = d3Line()
                .x((d) => {
                    return this.timeScale(d);
                })
                .y((d, i) => {
                    return this.intensityScale(this.intensitySeries[i]);
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
                var xValues = this.lineDots.map(d => this.timeScale(d[0]));
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
                    return `translate(${this.timeScale(d[0])}, ${this.intensityScale(d[1])})`;
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
                .attr('font-size', this.settings.dotNoteFontSize)
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
