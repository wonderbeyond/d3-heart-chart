<template>
<div class="container">
    <svg class="chart container" :width="fullWidth" :height="fullHeight">
        <g class="zoomer" :transform="`translate(${fullWidth - settings.zoomerWidth}, ${margin.top})`">
              <circle class="zoomer-end" cx="0" cy="0" r="2"></circle>
              <circle class="zoomer-end" :cx="settings.zoomerWidth" cy="0" r="2"></circle>
              <line class="zoomer-line" x1="0" :x2="settings.zoomerWidth" y1="0" y2="0"></line>
              <circle class="zoomer-cursor"></circle>
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
                <g class="track-area" style="pointer-events:all;">
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

            transformOptions: {
                zoomRate: 1,
                showTickStart: 0,
            },
        };
    },
    computed: {
        chartContainer() {
            return d3Select(this.$el).select('svg.chart.container');
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
        transformOptions: {
            deep: true,
            handler: function () {
                this.digestData();
            }
        }
    },
    created() {
        var course = require('./course-test-data.json');
        // this.$http.get(`http://demo.91jianke.com:1082/api/v2.0/activity-design/cardiograph/585b8c3857dccb66705f0bed`)
        //     .then(resp => {
        //         this.course = resp.body.data;
        //     });
        this.course = course;
        this.digestData();
    },
    mounted() {
        var zoomer = this.chartContainer.select('.zoomer');
        var vm = this;
        var drag = d3Drag()
            .on('drag', function() {
                this.x = (this.x || 0) + d3Event.dx;
                console.log('drag x', this.x)
                if (this.x < 0) this.x = 0;
                if (this.x > vm.settings.zoomerWidth) this.x = vm.settings.zoomerWidth;
                this.y = (this.y || 0);
                d3Select(this).attr('transform', function(){
                    return `translate(${this.x}, ${this.y})`;
                });
            });
        zoomer.select('.zoomer-cursor').call(drag);

        var main = this.chartContainer.select('.main');
        console.log('M:', main)

        var trackArea = main.select('.track-area');
        trackArea.on('click', () => {
            this.clickXOnDataLine = d3Mouse(trackArea.node())[0];
            console.log('C:', this.clickXOnDataLine)
        });
    },
    methods: {
        digestData() {
            console.info('Digesting data');
            var tranOpts = this.transformOptions;
            var sts = tranOpts.showTickStart;
            var stc = this.course.units.length / tranOpts.zoomRate;
            this.units = this.course.units.slice(sts, sts + stc);
            this.activities = [];
            this.timeSeries = [];
            this.intensitySeries = [];

            var durationCnt = 0;

            this.units.forEach(unit => {
                unit.start = durationCnt;
                unit.activities.forEach(activity => {
                    activity.start = durationCnt;
                    this.activities.push(activity);
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
