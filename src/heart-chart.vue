<template>
  <div class="container"></div>
</template>

<script>
var d3 = require('d3');

window.d3 = d3;
export default {
    data() {
        return {
            fullWidth: 396,
            fullHeight: 240,
            margin: {
                top: 20,
                right: 15,
                bottom: 20,
                left: 15,
            },
            xData: [0, 10, 30, 60, 70],
            yData: [8, 7, 2, 10, 6],
            timeSeries: [
                0, 20, 20, 30, 30, 40, 40, 50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 110,
                110, 120, 120, 130, 130, 140, 140, 150, 150, 160, 160, 180, 180, 200,
                200, 210, 210, 220, 220, 230, 230, 240],
            intensitySeries: [
                6, 6, 10, 10, 4, 4, 2, 2, 7, 7, 4, 4, 8, 8, 6, 6, 10, 10,
                6, 6, 3, 3, 8, 8, 7, 7, 5, 5, 1, 1, 5, 5,
                8, 8, 6, 6, 4, 4, 3, 3]
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
            var container = d3.select(this.$el).append('svg:svg')
                .attr('class', 'chart container')
                .attr('width', this.fullWidth)
                .attr('height', this.fullHeight);
            var main = container.append('svg:g')
                .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
                .attr('class', 'main')
                .attr('width', this.softWidth)
                .attr('height', this.softHeight);

            var timeScale = d3.scaleLinear()
                .domain([0, d3.max(this.timeSeries)])
                .range([0, this.softWidth]);

            var timeAxis = d3.axisBottom(timeScale)
                // .tickValues([0, 240])
                ;

            var intensityScale = d3.scaleLinear()
                .domain([0, d3.max(this.intensitySeries)])
                .range([0, this.softHeight]);

            main.append('svg:g')
                .attr('transform', `translate(0, ${this.softHeight})`)
                .attr('class', 'time axis')
                .call(timeAxis);
        }
    }
};
</script>

<style>
.container {
    width: 100%;
    height: 240px;
    border: 1px dashed rgb(176, 185, 179);
}
</style>
