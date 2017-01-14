<template>
<g>
    <rect class="unit-name-border-box"
        :x="bbox.x -2" :y="bbox.y"
        :width="bbox.width + 4" :height="bbox.height">
    </rect>
    <text :x="x" :y="y"><slot></slot></text>
</g>
</template>

<script>
import Vue from 'vue';
import {
    select as d3Select,
} from 'd3-selection';
import 'd3-selection-multi';

export default {
    props: ['x', 'y'],
    data() {
        return {
            bbox: {x: 0, y: 0, width: 0, height: 0}
        };
    },
    created() {
        ['x', 'y'].forEach(attr => {
            this.$watch(attr, () => Vue.nextTick(this.updateBBox));
        })
    },
    mounted() {
        this.updateBBox();
    },
    methods: {
        updateBBox() {
            var $t = d3Select(this.$el).select('text');
            console.log('updating bbox of', $t, $t.node().getBBox())
            this.bbox = $t.node().getBBox();
        }
    },
};
</script>

<style>
.unit-name-border-box {
    stroke: #CCC;
    fill: #FFF;
    fill-opacity: 1;
}
</style>
