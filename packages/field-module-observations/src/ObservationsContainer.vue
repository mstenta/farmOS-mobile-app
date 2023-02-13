<template>
  <app-bar-options :title="$t('Observations')" nav="back"/>

  <farm-main>
    <farm-stack :space="['none', 'none', 's']" :dividers="true">
      <h3>{{ $t('Images')}}</h3>

      <farm-card v-if="!log">
        <button
          type="button"
          class="btn btn-success"
          @click="addObservation"
          name="add">
          {{$t('Add Observation Log')}}
        </button>
      </farm-card>
      <farm-card v-if="log">
        <div class="form-item form-item-name form-group">
          <div class="input-group ">
            <label
              class="custom-file-label"
              for="customFile">
              {{ $t('Select photo from file') }}
            </label>
            <input
              type="file"
              accept="image/*"
              class="custom-file-input"
              ref="photo"
              @change="loadPhoto($event.target.files)">
          </div>
        </div>

        <div class="form-item form-item-name form-group">
          <!-- NOTE: Display is set to 'none' if the img fails to load. -->
          <img
            v-for="(image, i) in images"
            :src="image.url"
            :key="`preview-${i}`"
            onerror="this.style.display='none'"
            class="preview"/>
        </div>
        <div class="form-item form-group">
          <button
            type="button"
            class="btn btn-success"
            @click="save"
            name="save">
            {{$t('Save')}}
          </button>
        </div>
      </farm-card>
    </farm-stack>
  </farm-main>
</template>

<script>
const { useEntities } = window.lib;
const { computed, shallowRef } = window.Vue;

export default {
  name: 'ObservationsContainer',
  setup() {
    const {
      add, attachFile, commit, restoreFiles,
    } = useEntities();

    const log = shallowRef();
    function addObservation() {
      log.value = add('log', 'log--observation');
    }

    function loadPhoto(filelist) {
      attachFile(log.value, 'image', filelist);
    }

    const images = computed(() => (log.value ? restoreFiles(log.value, 'image') : []));
    function save() {
      commit(log.value).then(() => { log.value = undefined; });
    }

    return {
      addObservation,
      images,
      loadPhoto,
      log,
      save,
    };
  },
};
</script>

<style>
</style>
