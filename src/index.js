import Vue from 'vue';
import VueResource from 'vue-resource';
import HeartChart from './heart-chart.vue';

Vue.use(VueResource);

new Vue({
    render: h => h(HeartChart)
}).$mount('#app');
