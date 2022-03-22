<template>
  <div
    class="farm-map"
    :id="id"
    :style="[defaultStyles, overrideStyles]">
  </div>
</template>

<script>
// import '@farmos.org/farmos-map/src/main';

export default {
  name: 'FarmMap',
  emits: ['update-wkt'],
  data() {
    return {
      map: {},
      // TODO: where will mapbox key come from?
      mapboxAPIKey: null,
      layers: {
        wkt: null,
        geojson: null,
        mapbox: null,
      },
      // these can be overridden by the 'overrideStyles' prop
      defaultStyles: {
        height: '100vw',
      },
    };
  },
  props: {
    id: String,
    overrideStyles: Object,
    drawing: Boolean,
    options: {
      type: Object,
      controls: [Boolean, Array, Function],
      interactions: [Boolean, Array, Function],
      units: String,
      default() {
        return {
          controls: true,
          interactions: true,
          units: 'us',
        };
      },
    },
    wkt: {
      type: Array,
      validator: wktArray => wktArray.every(e => typeof e.title === 'string'
          && (typeof e.wkt === 'string' || !e.wkt)
          && typeof e.color === 'string'
          && (!e.visible || typeof e.visible === 'boolean')
          && typeof e.weight === 'number'
          && typeof e.canEdit === 'boolean'),
    },
    geojson: {
      title: String,
      geojson: Object,
      color: String,
      visible: Boolean,
    },
  },
  mounted() {
    // FIXME: farmOS-map is no longer added globally
    this.map = window.farmOS.map.create(this.id, this.options);
    if (this.geojson) {
      this.layers.geojson = this.map.addLayer('geojson', this.geojson);
    }
    let hasLayers = false;
    // De-weights layers without geometries
    const layerWeights = this.wkt.map(e => (e.wkt
      && e.wkt !== 'GEOMETRYCOLLECTION EMPTY'
      ? e.weight : 99));
    this.wkt.forEach((wktElement) => {
      // Zoom to the layer if it has the lowest weight
      if (!this.drawing
        && wktElement.wkt
        && wktElement.wkt !== 'GEOMETRYCOLLECTION EMPTY') {
        this.layers[wktElement.title] = this.map.addLayer('wkt', wktElement);
        if (wktElement.weight === Math.min(...layerWeights)) {
          this.map.zoomToLayer(this.layers[wktElement.title]);
        }
        hasLayers = true;
      }
      if (this.drawing) {
        if (wktElement.wkt && wktElement.wkt !== 'GEOMETRYCOLLECTION EMPTY') {
          if (wktElement.weight === Math.min(...layerWeights) && wktElement.canEdit) {
            this.layers[wktElement.title] = this.map.addLayer('wkt', wktElement);
            this.map.zoomToLayer(this.layers[wktElement.title]);
            this.map.addBehavior('edit', { layer: this.layers[wktElement.title] });
            this.map.addBehavior('measure', { layer: this.layers[wktElement.title] });
          } else if (wktElement.weight === Math.min(...layerWeights)) {
            this.layers[wktElement.title] = this.map.addLayer('wkt', wktElement);
            this.map.zoomToLayer(this.layers[wktElement.title]);
          } else {
            this.layers[wktElement.title] = this.map.addLayer('wkt', wktElement);
          }
          hasLayers = true;
        } else {
          this.map.addBehavior('edit');
          this.map.addBehavior('measure', { layer: this.map.edit.layer });
        }
      }
    });
    if (this.drawing && this.map.edit) {
      this.map.edit.wktOn('drawend', (wkt) => {
        this.$emit('update-wkt', wkt);
      });
      this.map.edit.wktOn('modifyend', (wkt) => {
        this.$emit('update-wkt', wkt);
      });
      this.map.edit.wktOn('translateend', (wkt) => {
        this.$emit('update-wkt', wkt);
      });
      this.map.edit.wktOn('delete', (wkt) => {
        this.$emit('update-wkt', wkt);
      });
    }
    if (!hasLayers) {
      this.map.zoomToVectors();
    }
    if (this.mapboxAPIKey) {
      const mapboxOpts = {
        title: 'MapBox Satellite',
        url: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=${this.mapboxAPIKey}`,
        group: 'Base layers',
        base: true,
        visible: true,
      };
      this.layers.mapbox = this.map.addLayer('xyz', mapboxOpts);
    }
  },
  beforeUnmount() {
    // FIXME: farmOS-map is no longer added globally
    window.farmOS.map.destroy(this.id);
    this.map = null;
  },
  watch: {
    wkt: {
      handler(newWKT) {
        if (!this.drawing) {
          let hasLayers = false;
          // Preferentially weights layers with geometries
          const layerWeights = newWKT.map(e => (e.wkt
            && e.wkt !== 'GEOMETRYCOLLECTION EMPTY'
            ? e.weight : 99));
          newWKT.forEach((newElement) => {
            // Zoom to the layer if it has the lowest weight
            if (this.layers[newElement.title]) {
              this.map.map.removeLayer(this.layers[newElement.title]);
              this.layers[newElement.title] = null;
            }
            if (newElement.wkt
            && newElement.wkt !== 'GEOMETRYCOLLECTION EMPTY') {
              this.layers[newElement.title] = this.map.addLayer('wkt', newElement);
              if (newElement.weight === Math.min(...layerWeights)) {
                this.map.zoomToLayer(this.layers[newElement.title]);
                hasLayers = true;
              }
            }
          });
          if (!hasLayers) {
            this.map.zoomToVectors();
          }
        }
      },
      deep: true,
    },
  },
};
</script>

<style>

</style>
