<template>
  <div class="container"></div>
</template>

<script>
var d3 = require('d3');

window.d3 = d3;
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
            course: require('./course-test-data.json'),
            activities: [],
            timeSeries: [0],
        };
    },
    computed: {
        softWidth() {
            return this.fullWidth - this.margin.left - this.margin.right;
        },
        softHeight() {
            return this.fullHeight - this.margin.top - this.margin.bottom;
        }
    },
    mounted() {
        this.draw();
    },
    methods: {
        draw() {
            const xAxisMainFontSize = 16;
            const xAxisMainTextDistance = 36;

            const yAxisMainFontSize = 16;
            const yAxisMainTextDistance = 20;

            const unitIndicatorHeight = 40;

            const dotNoteFontSize = 14;

            // Data processing
            var intensitySeries = [];
            var lineDots = [];
            var durationCnt = 0;
            this.course.units.forEach(unit => {
                unit.start = durationCnt;
                unit.activities.forEach(activity => {
                    activity.start = durationCnt;
                    this.activities.push(activity);
                    lineDots.push([durationCnt, activity.intensity]);
                    durationCnt += activity.duration;
                    activity.end = durationCnt;
                    unit.end = durationCnt;
                    this.timeSeries.push(durationCnt, durationCnt);
                    intensitySeries.push(activity.intensity, activity.intensity);
                });
            });
            intensitySeries.push(0);

            // Drawing svg container
            var container = d3.select(this.$el).append('svg:svg')
                .attr('class', 'chart container')
                .attr('width', this.fullWidth)
                .attr('height', this.fullHeight);
            var main = container.append('svg:g')
                .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
                .attr('class', 'main')
                .attr('width', this.softWidth)
                .attr('height', this.softHeight)
                .style('pointer-events', 'all');
            // Refer to: http://stackoverflow.com/questions/16918194/d3-js-mouseover-event-not-working-properly-on-svg-group
            main.append('svg:rect')
                .style('visibility', 'hidden')
                .attr('class', 'invisible-rectangle-as-placeholder')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', this.softWidth)
                .attr('height', this.softHeight);

            var timeScale = d3.scaleLinear()
                .domain([0, d3.max(this.timeSeries) + 10])
                .range([0, this.softWidth]);
            var timeAxis = d3.axisBottom(timeScale);
            timeAxis.tickValues(d3.range(this.activities[0].start,
                                         this.activities.slice(-1)[0].end + 0.001,
                                         10));
            timeAxis.tickFormat((d) => this.timeSeries.indexOf(d) >= 0?
                                        d : '');

            var intensityScale = d3.scaleLinear()
                .domain([0, d3.max(intensitySeries) + 1])
                .range([this.softHeight, 0]);

            var intensityAxis = d3.axisLeft(intensityScale);

            // Drawing X axis
            main.append('svg:g')
                .attr('transform', `translate(0, ${this.softHeight})`)
                .attr('class', 'time axis')
                .call(timeAxis);
            main.append('svg:text')
                .attr('class', 'x-axis-text main')
                .attr('x', this.softWidth + xAxisMainTextDistance)
                .attr('y', this.softHeight)
                .attr('font-size', xAxisMainFontSize)
                .text('时间');
            main.append('svg:text')
                .attr('class', 'x-axis-text second')
                .attr('x', this.softWidth + xAxisMainTextDistance)
                .attr('y', this.softHeight + xAxisMainFontSize)
                .attr('font-size', xAxisMainFontSize * 0.6)
                .text('（分钟）');

            // Drawing course unit indicator
            var gUnitIndicator = main.append('svg:g')
                .attr('class', 'course-unit-indicator')
                .attr('transform', `translate(0, ${this.softHeight + 20})`)
            var gUnitSection = gUnitIndicator
                .selectAll('unit')
                .data(this.course.units)
                .enter()
                .append('svg:g')
                    .attr('class', 'unit-section')
            gUnitSection.append('svg:text')
                .attr('x', d => timeScale((d.start + d.end)/2))
                .attr('y', unitIndicatorHeight/2)
                .text(d => `单元${d.id}：${d.name}`)
            var unitSepLine = d3.line();
            gUnitSection.append('svg:path')
                .attr('class', 'sep-line')
                .attr('d', (d, i) => {
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
                .attr('d', (d, i) => {
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
            var line = d3.line()
                .x((d) => {
                    return timeScale(d);
                })
                .y((d, i) => {
                    return intensityScale(intensitySeries[i]);
                });
            main.append('svg:path')
                // .transition()
                // .delay(10)
                .attr('class', 'data-line')
                .attr('d', line(this.timeSeries));

            // Drawing line dots
            var gLineDots = main.append('svg:g')
                .attr('class', 'line-dots');

            var gDots = gLineDots.selectAll('dot')
                .data(lineDots)
                .enter()
                .append('svg:g')
                .attr('transform', (d) => {
                    return `translate(${timeScale(d[0])}, ${intensityScale(d[1])})`;
                })
                .attr('class', 'dot-container');
            gDots.append('svg:circle')
                .attr('class', 'line-dot')
                .attr('r', 3)
                // .attr('cx', d => {
                //     return timeScale(d[0]);
                // })
                // .attr('cy', (d) => {
                //     return intensityScale(d[1]);
                // });
            gDots.append('svg:text')
                .attr('class', 'dot-note')
                .attr('font-size', dotNoteFontSize)
                .attr('x', 0)
                .attr('y', -5)
                .text((d, i) => {
                    var a = this.activities[i];
                    return `${a.name}/${a.intensity}`;
                });

            // Dots clickable
            main.on('click', function() {
                console.log('C:', this)
            })
        }
    }
};
</script>

<style>
$primary-color: #40ab56;
$dot-note-color: $primary-color;

.container {
    width: 100%;
    min-height: 400px;
}

svg.chart {
    & .x-axis-text,
    & .y-axis-text {
        fill: #333;
        text-anchor: middle;
    }
    & .course-unit-indicator {
        & text {
            alignment-baseline: central;
            text-anchor: middle;
            fill: #333;
            font-size: 14px;
        }
        & .sep-line {
            stroke: #000;
            stroke-dasharray: 3,2;
        }
    }
    & .data-line {
        stroke: $primary-color;
        stroke-width: 1;
        fill: none;
    }
    & .dot-container {
        & .dot-note {
            text-anchor: start;
            fill: $dot-note-color;
            font-weight: bold;
        }
    }
    & .line-dot {
        fill: #349a49;
    }
}
</style>
