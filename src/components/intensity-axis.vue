<template><g></g></template>

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

export default {
    props: ['scale'],
    methods: {
        draw() {
            var Axis = d3AxisLeft(this.scale);
            Axis.tickFormat((d) => d % 2 == 0 ? d : '');
            d3Select(this.$el).call(Axis);
        }
    },
    created() {
        ['scale'].forEach(attr => {
            this.$watch(attr, () => {
                this.draw();
            });
        });
    },
    mounted() {
        this.draw();
    }
};
</script>

<style>
</style>
