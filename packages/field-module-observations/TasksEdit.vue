<template>
<farm-tabs
  :tabs="['General', 'Movement']"
  :initTab="$router.currentRoute.value.params.tab"
  :space="['none', 'none', 's']">

  <template #general>
    <app-bar-options :title="$t('Edit Log')" nav="back" :actions="appBarActions"/>
    <farm-stack v-if="log" :space="['none', 'none', 's']" :dividers="true">

      <farm-card>
        <div class="form-item form-group">
          <farm-toggle-check
            :label="$t('Done')"
            labelPosition="after"
            :checked="log.status === 'done'"
            @input="update({ status: $event ? 'done' : 'pending' })"/>
        </div>
        <div class="form-item form-item-name form-group">
          <label for="name" class="control-label">{{ $t('Name') }}</label>
          <input
            :value="log.name"
            @input="update({ name: $event.target.value })"
            :placeholder="$t('Enter name')"
            type="text"
            class="form-control"
            maxlength="250"
            autofocus>
        </div>
        <farm-date-time-form
          :timestamp="log.timestamp"
          @input="update({ timestamp: $event })"/>
        <div class="form-item form-item-name form-group">
          <label for="type" class="control-label ">{{ $t('Log Type') }}</label>
          <div class="form-item">
            <p> {{ $t(typeLabel) }} </p>
          </div>
        </div>
      </farm-card>

      <farm-card>
        <div class="form-item form-item-name form-group">
          <label for="notes" class="control-label ">{{ $t('Notes') }}</label>
          <textarea
            :value="parseNotes(log.notes)"
            @input="updateNotes($event.target.value)"
            :placeholder="$t('Enter notes')"
            type="text"
            rows="4"
            class="form-control">
          </textarea>
        </div>
      </farm-card>

      <farm-card>
        <h3>{{ $t('Log Categories') }}</h3>
        <div v-if="showAllCategories" id="categories" class="form-item form-group">
          <farm-select-box
            small
            v-for="cat in categories"
            :id="`category-${cat.id}-${cat.name}`"
            :selected="log.category.some(c => c.id === cat.id)"
            :label="cat.name"
            :key="`category-${cat.id}-${cat.name}`"
            @input="toggleRelationship('category', cat)">
          </farm-select-box>
          <div class="show-hide">
            <div @click="showAllCategories = !showAllCategories">
              <p><icon-expand-less/>{{ $t('Show Less') }}</p>
            </div>
          </div>
        </div>
        <div v-else id="categories" class="form-item form-group">
          <p v-if="!log.category || log.category.length < 1">
            {{ $t('No categories selected') }}
          </p>
          <farm-select-box
            small
            v-for="cat in categories.selected"
            :id="`category-${cat.id}-${cat.name}`"
            :selected="true"
            :label="cat.name"
            :key="`category-${cat.id}-${cat.name}`"
            @input="toggleRelationship('category', cat)">
          </farm-select-box>
          <div class="show-hide">
            <div @click="showAllCategories = !showAllCategories">
              <p><icon-expand-more/>{{ $t('Show More') }}</p>
            </div>
          </div>
        </div>
      </farm-card>

      <farm-card v-if="log.quantity !== undefined">
        <h3>{{ $t('Quantities')}} 🚧 UNDER CONSTRUCTION 🚧</h3>
        <!-- <label for="quantity" class="control-label ">
          {{ $t('Add new or edit existing quantity')}}
        </label>
        <div v-if="currentQuant >= 0" class="form-item form-item-name form-group"> -->
          <!-- To display a placeholder value ONLY when there are no existing
          quantities, we must add the placeholder with an <option> tag and
          select it using the :value option -->
          <!-- <select
            :value="(log.quantity
              && log.quantity.length > 0
              && log.quantity[currentQuant].measure)
              ? log.quantity[currentQuant].measure
              : 'Select measure'"
            @input="updateQuantity('measure', $event.target.value, currentQuant)"
            class="custom-select col-sm-3 ">
              <option>{{ $t('Select measure')}}</option>
              <option
                v-for="(measure, i) in quantMeasures"
                :value="measure"
                :key="`measure-${i}`">
                {{ measure }}
              </option>
          </select>
          <input
            :value="(log.quantity
              && log.quantity.length > 0)
              ? log.quantity[currentQuant].value
              : null"
            @input="updateQuantity('value', $event.target.value, currentQuant)"
            :placeholder="$t('Enter value')"
            type="number"
            class="form-control"/>
          <select
          :value="(log.quantity
              && log.quantity.length > 0
              && log.quantity[currentQuant].unit)
              ? log.quantity[currentQuant].unit.id
              : 'Select unit'"
            @input="updateQuantity('unit', $event.target.value, currentQuant)"
            class="custom-select col-sm-3 ">
              <option>{{ $t('Select unit')}}</option>
              <option
                v-for="(unit, i) in units"
                :value="unit.id"
                :key="`unit-${i}`">
                {{ (units) ? unit.name : '' }}
              </option>
          </select>
          <input
            :value="(log.quantity
              && log.quantity.length > 0)
              ? log.quantity[currentQuant].label
              : null"
            @input="updateQuantity('label', $event.target.value, currentQuant)"
            :placeholder="$t('Enter label')"
            type="text"
            class="form-control"/>
        </div>
        <div class="form-item form-group">
          <ul
            v-if="log.quantity
              && log.quantity.length > 0"
            class="list-group">
            <li
              v-for="(quant, i) in log.quantity"
              v-bind:key="`quantity-${i}`"
              @click="currentQuant = i"
              class="list-group-item">
              {{ quant.measure }}&nbsp;
              {{ quant.value }}&nbsp;
              {{ (quantUnitNames.length > 0) ? quantUnitNames[i] : '' }}&nbsp;
              {{ quant.label }}
              <span class="remove-list-item" @click="removeQuant(i); $event.stopPropagation()">
                &#x2715;
              </span>
            </li>
          </ul>
        </div>
        <div class="form-item form-group">
          <button
            type="button"
            class="btn btn-success"
            @click="updateQuantity(null, null, -1)"
            name="addNewQuantity">
            {{$t('Add another quantity')}}
          </button>
        </div> -->
      </farm-card>

      <farm-card>
        <h3>{{ $t('Assets')}}</h3>
        <farm-autocomplete
          :list="assets.unselected"
          :keys="['name']"
          @select="toggleRelationship('asset', assets.unselected[$event])"
          :label="$t('Add assets to the log')">
          <template v-slot:empty>
            <div class="empty-slot">
              <em>{{ $t('No assets found.')}}</em>
            </div>
          </template>
        </farm-autocomplete>
        <div class="form-item form-item-name form-group">
          <ul class="list-group">
            <li
              v-for="asset in assets.selected"
              :key="`asset-${asset.id}`"
              class="list-group-item">
              {{ asset.name }}
              <span class="remove-list-item" @click="toggleRelationship('asset', asset)">
                &#x2715;
              </span>
            </li>
          </ul>
        </div>
        <div v-if="log.equipment" class="form-item form-item-name form-group">
          <label for="type" class="control-label ">{{ $t('Equipment') }}</label>
          <div class="input-group">
            <select
              @input="toggleRelationship('equipment', equipment.unselected[i])"
              class="custom-select col-sm-3 ">
              <option value=""></option>
              <option
                v-for="(equip, i) in equipment.unselected"
                :value="i"
                :key="`equip-${i}`">
                {{ (equip) ? equip.name : '' }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-item form-group">
          <ul v-if="log.equipment" class="list-group">
            <li
              v-for="(equip, i) in equipment.selected"
              v-bind:key="`equipment-${i}`"
              class="list-group-item">
              {{ equip.name }}
              <span class="remove-list-item" @click="toggleEqupment(false, equip.id)">
                &#x2715;
              </span>
            </li>
          </ul>
        </div>
      </farm-card>

      <farm-card>
        <h3>{{ $t('Areas')}} &amp; {{ $t('Location')}}</h3>
        <!-- We're using a radio button to choose whether areas are selected
        automatically based on device location, or using an autocomplete.
        This will use the useLocalAreas conditional var -->
        <!-- <div
          v-if="settinngs.permissions.geolocation"
          class="form-item form-item-name form-group">
          <div class="form-check">
            <input
            v-model="useLocalAreas"
            type="radio"
            class="form-check-input"
            id="dontUseGeo"
            name="geoRadioGroup"
            v-bind:value="false"
            checked>
            <label class="form-check-label" for="dontUseGeo">{{ $t('Search areas')}}</label>
          </div>
          <div class="form-check">
            <input
            v-model="useLocalAreas"
            type="radio"
            class="form-check-input"
            id="doUseGeo"
            name="geoRadioGroup"
            v-bind:value="true"
            >
            <label class="form-check-label" for="doUseGeo">{{ $t('Use my location')}}</label>
          </div>
        </div> -->
        <!-- If using the user's, show a select menu of nearby locations -->
        <div v-if="useLocalAreas" class="form-group">
          <label for="areaSelector">{{ $t('Farm areas near your current location')}}</label>
          <select
            @input="toggleRelationship('location', localAreas[$event.target.value])"
            class="form-control"
            name="areas">
            <option v-if="localAreas.length < 1" value="">No other areas nearby</option>
            <option v-if="localAreas.length > 0" value="" selected>-- Select an Area --</option>
            <option
              v-for="(area, i) in localAreas"
              :value="i"
              :key="`local-area-${area.id}`">
              {{area.name}}
            </option>
          </select>
        </div>
        <!-- If not using the user's location, show a search bar -->
        <farm-autocomplete
          v-if="!useLocalAreas"
          :list="locations.unselected"
          :keys="['name']"
          @select="toggleRelationship('location', locations.unselected[$event])"
          :label="$t('Add areas to the log')">
          <template v-slot:empty>
            <div class="empty-slot">
              <em>{{ $t('No areas found.')}}</em>
            </div>
          </template>
        </farm-autocomplete>
        <div class="form-item form-item-name form-group">
          <ul class="list-group">
            <li
              v-for="location in locations.selected"
              v-bind:key="`remove-area-${location.id}`"
              class="list-group-item">
              {{ location.name }}
              <span class="remove-list-item" @click="toggleRelationship('location', area)">
                &#x2715;
              </span>
            </li>
          </ul>
        </div>
      </farm-card>

      <farm-card>
        <h3>{{ $t('Images')}} 🚧 UNDER CONSTRUCTION 🚧</h3>
        <!-- <div
          class="form-item form-item-name form-group">
          <button
            :disabled='false'
            title="Take picture with camera"
            @click="getPhoto"
            class="btn btn-info btn-navbar navbar-right"
            type="button">
            {{ $t('Take picture with camera')}}
          </button>
        </div>
        <div class="form-item form-item-name form-group">
          <div class="input-group ">
            <label
              class="custom-file-label"
              for="customFile">
              {{ $t('Select photo from file')}}
            </label>
            <input
              type="file"
              accept="image/*"
              class="custom-file-input"
              ref="photo"
              @change="loadPhoto($event.target.files)">
          </div>
        </div> -->
        <!-- NOTE: Display is set to 'none' if the img fails to load. -->
        <!-- <div class="form-item form-item-name form-group">
          <img
            v-for="(url, i) in imageUrls"
            :src="url"
            :key="`preview-${i}`"
            onerror="this.style.display='none'"
            class="preview" />
        </div> -->
      </farm-card>

    </farm-stack>
  </template>

  <template #movement>

    <farm-card v-if="log"><h3>🚧 UNDER CONSTRUCTION 🚧</h3></farm-card>
    <!-- <farm-card v-if="log.movement !== undefined">

      <farm-autocomplete
        :list="assets.unselected"
        :keys="['name']"
        @select="togglerelationship('asset', assets.unselected[$event])"
        :label="$t('Add assets to be moved')">
        <template v-slot:empty>
          <div class="empty-slot">
            <em>{{ $t('No assets found.')}}</em>
          </div>
        </template>
      </farm-autocomplete>

      <div class="form-item form-item-name form-group">
        <ul class="list-group">
          <li
            v-for="asset in assets.selected"
            :key="`asset-movement-${asset.id}`"
            class="list-group-item">
            {{ asset.name }}
            <span class="remove-list-item" @click="togglerelationship('asset', asset)">
              &#x2715;
            </span>
          </li>
        </ul>
      </div>

      <farm-autocomplete
        :list="areas.unselected"
        :keys="['name']"
        @select="addMovementArea(areas.unselected[$event])"
        :label="$t('Movement to')">
        <template v-slot:empty>
          <div class="empty-slot">
            <em>{{ $t('No areas found.')}}</em>
          </div>
        </template>
      </farm-autocomplete>

      <div class="form-item form-item-name form-group">
        <ul class="list-group">
          <li
            v-for="(area, i) in areas.selected"
            v-bind:key="`remove-movement-${i}`"
            class="list-group-item">
            {{ area.name }}
            <span class="remove-list-item" @click="removeMovementArea(area)">
              &#x2715;
            </span>
          </li>
        </ul>
      </div>

      <router-link :to="{ name: 'tasks-map' }">
        <farm-map
          id="map"
          :overrideStyles="{ height: '90vw' }"
          :drawing="false"
          :options="{
            controls: (defaults) =>
              defaults.filter(def => def.constructor.name === 'Attribution'),
            interactions: false,
          }"
          :wkt=mapLayers
          :geojson="{
            title: 'areas',
            geojson: areaGeoJSON,
            color: 'grey',
          }"/>
      </router-link>

    </farm-card> -->
  </template>

</farm-tabs>
</template>

<script>
const {
  computed, inject, reactive, ref,
} = window.Vue;
const {
  R,
  parseNotes,
  // removeGeometry,
  // isNearby,
} = window.lib;

// Used to separate assets, areas, etc into those that have already been added
// to the log (selected), and those that haven't (unselected).
const partitionOptions = (options = [], selections = []) => {
  const [selected, unselected] = R.partition(
    opt => selections.some(sel => sel.id === opt.id),
    options,
  );
  return { selected, unselected };
};

// Quantity measures are static strings, so no need to make them reactive.
const quantMeasures = [
  'count',
  'length',
  'weight',
  'area',
  'volume',
  'time',
  'temperature',
  'water_content',
  'value',
  'rating',
  'ratio',
  'probability',
];

export default {
  name: 'TasksEdit',
  setup() {
    // LOCAL STATE
    const localAreas = reactive([]);
    const useLocalAreas = ref(false);
    const awaitingLocation = ref(false);
    const showAllCategories = ref(false);
    const currentQuant = ref(-1);

    // APP SHELL DATA
    const alert = inject('alert');
    const bundles = inject('bundles');
    const settings = inject('settings');

    // ENTITIES
    const { assets, equipment, locations } = inject('assets');
    const { categories, units } = inject('terms');
    const {
      current, update, save, close,
    } = inject('logs');

    return {
      parseNotes,
      quantMeasures,
      localAreas,
      useLocalAreas,
      awaitingLocation,
      showAllCategories,
      currentQuant,
      alert,
      typeLabel: bundles.log?.[current.type]?.label || '',
      settings,
      log: current,
      update,
      save,
      close,
      units,
      assets: computed(() => partitionOptions(assets.value, current.asset)),
      equipment: computed(() => partitionOptions(equipment.value, current.equipment)),
      locations: computed(() => partitionOptions(locations.value, current.location)),
      categories: computed(() => partitionOptions(categories.value, current.category)),
      appBarActions: computed(() => {
        const logURL = current.url;
        const openInNew = logURL ? [{
          icon: 'icon-open-in-new',
          onClick() { window.open(logURL, '_blank'); },
          text: 'Open in browser',
        }] : [];
        return openInNew;
      }),
      updateNotes(value) {
        update({ notes: { value, format: 'default' } });
      },
      toggleRelationship(relationship, { id, type }) {
        const i = current[relationship].findIndex(e => e.id === id);
        if (i < 0) {
          const changed = current[relationship].concat({ id, type });
          update({ [relationship]: changed });
        } else {
          const changed = [
            ...current[relationship].slice(0, i),
            ...current[relationship].slice(i + 1),
          ];
          update({ [relationship]: changed });
        }
      },
    };
  },

  beforeMount() {
    if (!this.log) {
      this.$router.push({ path: '/tasks' });
    }
  },
  beforeRouteLeave() {
    if (this.log) {
      this.save(this.log);
    }
  },

  // props: [
  //   'areaGeoJSON',
  // ],

  // methods: {
  //   updateQuantity(key, value, index) {
  //     const currentQuants = this.log.quantity || [];
  //     const storedVal = (key === 'unit')
  //       ? { id: value, type: 'taxonomy_term--unit' }
  //       : value;
  //     let updatedQuant; let updatedQuants;
  //     if (index >= 0) {
  //       updatedQuant = { ...currentQuants[index], [key]: storedVal };
  //       updatedQuants = [
  //         ...currentQuants.slice(0, index),
  //         updatedQuant,
  //         ...currentQuants.slice(index + 1),
  //       ];
  //     } else {
  //       updatedQuant = {
  //         measure: null,
  //         value: null,
  //         unit: null,
  //         label: null,
  //       };
  //       updatedQuants = [...currentQuants, updatedQuant];
  //     }
  //     this.update({ quantity: updatedQuants });
  //     if (index < 0) {
  //       this.currentQuant = updatedQuants.length - 1;
  //     }
  //   },

  //   addMovementArea(area) {
  //     const { id, type } = area;
  //     const areaReference = { id, type: `asset--${type}` };
  //     // TODO: replace geofield property
  //     const areaGeometry = area.geofield[0]?.geom;
  //     const prevMovement = this.log.movement;
  //     const newGeometry = prevMovement
  //       ? mergeGeometries([areaGeometry, prevMovement.geometry])
  //       : areaGeometry;
  //     const newMovement = {
  //       area: prevMovement
  //         ? prevMovement.area.concat(areaReference)
  //         : [areaReference],
  //       geometry: newGeometry,
  //     };
  //     this.update({ movement: newMovement });
  //   },

  //   removeMovementArea(area) {
  //     const newAreas = this.log.movement.area
  //       .filter(_area => _area.id !== area.id);
  //     const prevGeometry = this.log.movement.geometry;
  //     let areaGeometry = null;
  //     // TODO: Replace geofield property.
  //     if (area.geofield[0]) {
  //       areaGeometry = area.geofield[0].geom;
  //     }
  //     const newGeometry = removeGeometry(prevGeometry, areaGeometry);
  //     const newMovement = {
  //       geometry: newGeometry,
  //       area: newAreas,
  //     };
  //     this.update({ movement: newMovement });
  //   },

  //   removeQuant(index) {
  //     if (this.currentQuant >= index) {
  //       this.currentQuant -= 1;
  //     }
  //     const newQuant = [
  //       ...this.log.quantity.slice(0, index),
  //       ...this.log.quantity.slice(index + 1),
  //     ];
  //     this.update({ quantity: newQuant });
  //   },

  //   getPhoto() {
  //     // Obtains an image location from the camera!
  //     return this.$store.dispatch('getPhotoFromCamera', this.log);
  //   },

  //   loadPhoto(files) {
  //     for (let i = 0; i < files.length; i += 1) {
  //       this.$store.dispatch('loadPhotoBlob', {
  //         file: files[i],
  //         log: this.log,
  //       });
  //     }
  //   },
  // },

  // computed: {
  //   quantUnitNames() {
  //     if (this.units.length > 0 && this.log?.quantity.length > 0) {
  //       const unitNames = [];
  //       this.log.quantity.forEach((quant) => {
  //         if (quant.unit) {
  //           this.units.forEach((unit) => {
  //             if (parseInt(unit.id, 10) === parseInt(quant.unit.id, 10)) {
  //               unitNames.push(unit.name);
  //             }
  //           });
  //         } else {
  //           unitNames.push(null);
  //         }
  //       });
  //       return unitNames;
  //     }
  //     return [];
  //   },
  //   imageUrls() {
  //     return this.log.images
  //       .filter(img => typeof img === 'string');
  //   },
  //   mapLayers() {
  //     const movement = {
  //       title: 'movement',
  //       wkt: this.log.movement?.geometry,
  //       color: 'orange',
  //       visible: true,
  //       weight: 0,
  //       canEdit: !!this.log.movement?.geometry,
  //     };
  //     const previousGeoms = this.log.asset
  //       ?.map(logAsset => this.assets
  //         ?.find(asset => asset.id === logAsset.id)?.geometry);
  //     const previousWKT = previousGeoms ? mergeGeometries(previousGeoms) : undefined;
  //     const previous = {
  //       title: 'previous',
  //       wkt: previousWKT,
  //       color: 'green',
  //       visible: true,
  //       weight: 1,
  //       canEdit: false,
  //     };
  //     return [previous, movement];
  //   },
  // },

  // watch: {
  //   useLocalAreas() {
  //     function filterAreasByProximity(position) {
  //       this.localAreas = this.locations.unselected
  //         .filter(area => !!area.geofield[0] && isNearby(
  //           [position.coords.longitude, position.coords.latitude],
  //           area.geofield[0].geom,
  //           (position.coords.accuracy),
  //         ));
  //     }
  //     function onError(error) {
  //       this.alert(error);
  //     }
  //     // If useLocalAreas is set to true, get geolocation and nearby areas
  //     if (this.useLocalAreas) {
  //       const options = {
  //         enableHighAccuracy: true,
  //         timeout: 10000,
  //         maximumAge: 0,
  //       };

  //       const watch = navigator.geolocation.watchPosition(
  //         filterAreasByProximity.bind(this),
  //         onError.bind(this),
  //         options,
  //       );
  //       setTimeout(() => {
  //         navigator.geolocation.clearWatch(watch);
  //       }, 5000);
  //     }
  //   },
  // },
};

</script>

<style scoped>
  textarea {
    resize: vertical;
  }

  .reset-margin {
    margin: 0 0;
  }
  .preview {
    width: 100%;
    height: 100%;
  }

  .empty-slot {
    text-align: center;
    color: var(--light);
  }

  .empty-slot button {
    margin: 0.5rem;
    color: var(--light);
  }

  .remove-list-item {
    float: right;
    cursor: pointer;
  }

  #categories {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
  }

  #categories-label {
    flex: 1 0 100%;
  }

  #categories p {
    font-style: italic;
  }

  .show-hide {
    flex: 1 0 100%;
  }

  .show-hide p {
    font-size: 1rem;
  }

  .show-hide svg {
    vertical-align: bottom;
  }

</style>
