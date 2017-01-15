<template>
<div class="container">
    <svg class="chart container" :width="fullWidth" :height="fullHeight">
        <g class="zoomer" :transform="`translate(${fullWidth - settings.zoomerWidth}, ${margin.top})`">
              <circle class="zoomer-end" cx="0" cy="0" r="2"></circle>
              <circle class="zoomer-end" :cx="settings.zoomerWidth" cy="0" r="2"></circle>
              <line class="zoomer-line" x1="0" :x2="settings.zoomerWidth" y1="0" y2="0"></line>
              <text class="hint" :x="zoomerCursorOffset" y="-12">{{transformOptions.zoomRate|formatRate}}</text>
              <circle class="zoomer-cursor" :transform="`translate(${zoomerCursorOffset}, 0)`"></circle>
        </g>
        <g class="main" :transform="`translate(${margin.left}, ${margin.top})`"
              :width="softWidth" :height="softHeight">
            <g class="zoomable-view">
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
                    <g v-for="(unit, index) in units" class="unit">
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
                        <path class="sep-line" v-if="index == (units.length - 1)"
                            :d="genUnitSepLineCmd({unit: unit, side: 'right'})">
                        </path>
                    </g>
                </g>
                <path class="data-line" :d="dataLineCmd"></path>
                <g class="track-area" :class="{dragging: draggingChart}" style="pointer-events:all;">
                    <rect class="invisible-rectangle-as-placeholder" style="visibility:hidden"
                        x="0" y="0" :width="softWidth" :height="softHeight">
                    </rect>
                </g>
                <g class="line-dots">
                    <g v-for="(ac, index) in activities" class="dot-container"
                        :class="{active: ac.id == selectedActivityID}"
                        :transform="`translate(${timeScale(ac.start)}, ${intensityScale(ac.intensity)})`">
                        <circle class="line-dot"></circle>
                        <text class="dot-note"
                            x="0" y="-5"
                            v-text="`${activities[index].name}/${activities[index].intensity}`"
                            font-size="settings.dotNoteFontSize">
                        </text>
                    </g>
                </g>
            </g>
            <intensity-axis class="intensity axis" :scale="intensityScale"></intensity-axis>
        </g>
    </svg>
</div>
</template>

<script>
import Vue from 'vue';
import {min, max, merge, range} from 'd3-array';
import {last, closest} from 'utils/array';
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
import intensityAxis from 'components/intensity-axis.vue';

export default {
    components: {
        'boxed-text': boxedText,
        'time-axis': timeAxis,
        'intensity-axis': intensityAxis,
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

                zoomerWidth: 100,
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
            units: [],
            activities: [],
            timeSeries: [],
            intensitySeries: [],
            clickXOnDataLine: null,

            zoomerCursorOffset: 1,
            draggingChart: false,
            draggingChartDistance: 0,
            firstVisibleTickIndex: 0,
        };
    },
    computed: {
        chartContainer() {
            return d3Select(this.$el).select('svg.chart.container');
        },
        allowedZoomRates() {
            var len = this.course.units.length;
            return range(1, len + 1).reverse().map(v => len/v);
        },
        transformOptions() {
            // var rate = (this.zoomerCursorOffset/this.settings.zoomerWidth)*this.course.units.length
            // if (rate < 1) {
            //     rate = 1;
            // }
            // if (rate > this.course.units.length) {
            //     rate = this.course.units.length;
            // }

            var allowCnts = range(1, this.course.units.length + 1).reverse();
            var showCntIdx = Math.floor(this.zoomerCursorOffset/(this.settings.zoomerWidth/this.course.units.length));
            if (showCntIdx < 0) {
                showCntIdx = 0;
            } else if (showCntIdx > allowCnts.length - 1) {
                showCntIdx = allowCnts.length - 1;
            }
            var showCnt = allowCnts[showCntIdx];
            return {
                zoomRate: this.course.units.length / showCnt,
            }
        },

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
            return d3ScaleLinear().domain([min(this.timeSeries), max(this.timeSeries) + 10])
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
        dataLineCmd() {
            var line = d3Line()
                .x((d) => {
                    return this.timeScale(d);
                })
                .y((d, i) => {
                    return this.intensityScale(this.intensitySeries[i]);
                });
            return line(this.timeSeries);
        },
        selectedActivityID() {
            if (this.clickXOnDataLine == null) {
                return this.maxIntensityActivities[0].id;
            }
            var xValues = this.activities.map(d => this.timeScale(d.start));
            var deltas = xValues.map(d => {
                return Math.abs(this.clickXOnDataLine - d);
            });
            var closest = deltas.indexOf(min(deltas));
            return this.activities[closest].id;
        },
    },
    watch: {
        transformOptions() {
            this.transformData();
        },
        firstVisibleTickIndex() {
            this.transformData();
        },
    },
    created() {
        var course = require('./course-test-data.json');
        this.course = this.digestData(course);
        this.transformData();

        if(0)this.$http.get(`http://demo.91jianke.com:1082/api/v2.0/activity-design/cardiograph/585b8c3857dccb66705f0bed`)
            .then(resp => {
                this.course = this.digestData(resp.body.data);
                this.transformData();
            });
    },
    mounted() {
        var zoomer = this.chartContainer.select('.zoomer');
        var vm = this;
        zoomer.select('.zoomer-cursor').call(d3Drag()
            .on('drag', () => {
                vm.zoomerCursorOffset = (vm.zoomerCursorOffset || 1) + d3Event.dx;
                if (vm.zoomerCursorOffset < 1) {
                    vm.zoomerCursorOffset = 1;
                }
                if (vm.zoomerCursorOffset > vm.settings.zoomerWidth) {
                    vm.zoomerCursorOffset = vm.settings.zoomerWidth;
                }
            }));

        var main = this.chartContainer.select('.main');

        var trackArea = main.select('.track-area');
        trackArea.on('click', () => {
            this.clickXOnDataLine = d3Mouse(trackArea.node())[0];
        });

        trackArea.call(d3Drag()
            .on('start', () => {
                this.draggingChart = true;
                this.draggingChartDistance = 0;
            })
            .on('drag', () => {
                this.draggingChartDistance += d3Event.dx;
            })
            .on('end', () => {
                this.draggingChart = false;
                if (Math.abs(this.draggingChartDistance) > 10) {
                    var idx = this.firstVisibleTickIndex + (this.draggingChartDistance > 10 ? -1 : 1);
                    if (idx < 0) {
                        this.firstVisibleTickIndex = 0;
                    } else if (idx > this.course.units.length - 1) {
                        this.firstVisibleTickIndex = this.course.units.length - 1;
                    } else {
                        this.firstVisibleTickIndex = idx;
                    }
                }
            }));
    },
    filters: {
        formatRate(rate) {
            return Number(rate * 100).toFixed(0) + '%';
        }
    },
    methods: {
        digestData(course) {
            var durationCnt = 0;
            course.units.forEach(unit => {
                unit.start = durationCnt;
                unit.activities.forEach(activity => {
                    activity.start = durationCnt;
                    durationCnt += activity.duration;
                    activity.end = durationCnt;
                    unit.end = durationCnt;
                });
            });
            return course;
        },
        transformData() {
            var tranOpts = this.transformOptions;
            var sts = this.firstVisibleTickIndex;
            var stc = this.course.units.length / tranOpts.zoomRate;
            this.units = this.course.units.slice(sts, sts + stc);
            this.activities = [];
            this.timeSeries = [];
            this.intensitySeries = [];

            this.units.forEach(unit => {
                unit.activities.forEach(activity => {
                    this.activities.push(activity);
                    this.timeSeries.push(activity.start, activity.end);
                    this.intensitySeries.push(activity.intensity, activity.intensity);
                });
            });
            if (last(this.units).id == last(this.course.units).id) {
                this.timeSeries.push(last(this.units).end);
                this.intensitySeries.push(0);
            }
        },
        genUnitSepLineCmd({unit, side='left'}) {
            var line = d3Line();
            var x = (side == 'left' ? unit.start : unit.end);
            return line([
                [this.timeScale(x), 0],
                [this.timeScale(x), this.settings.unitIndicatorHeight],
            ]);
        },
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
            stroke-width: 2;
        }
        & .zoomer-cursor {
            cursor: pointer;
            r: 10;
            fill: #333;
        }
        & .hint {
            text-anchor: middle;
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
        &.dragging {
            cursor: move;
        }
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
