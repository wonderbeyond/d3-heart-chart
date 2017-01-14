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
import boxedText from 'components/boxed-text.vue';
import timeAxis from 'components/boxed-text.vue';

export default {
    props: ['scale', 'tickValues'],
    methods: {
        draw() {
            console.log('Drawing X');
            var timeAxis = d3AxisBottom(this.scale);
            timeAxis.tickValues(this.tickValues);
            timeAxis.tickFormat((d) => this.tickValues.indexOf(d) >= 0?
                                        d : '');
            d3Select(this.$el).call(timeAxis);
        }
    },
    created() {
        ['scale', 'tickValues'].forEach(attr => {
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
