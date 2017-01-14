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
import {
    select as d3Select,
} from 'd3-selection';
import 'd3-selection-multi';

export default {
    props: ['x', 'y', 'width', 'height'],
    data() {
        return {
            bbox: {x: 0, y: 0, width: 0, height: 0}
        };
    },
    mounted() {
        var $c = d3Select(this.$el);
        this.bbox = $c.select('text').node().getBBox();
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
