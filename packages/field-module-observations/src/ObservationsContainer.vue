<template>
  <app-bar-options :title="$t('Observations')" nav="back"/>

  <farm-main>
    <farm-stack :space="['none', 'none', 's']" :dividers="true">
      <h3>{{ $t('Images')}}</h3>

      <farm-card v-if="!current">
        <button
          type="button"
          class="btn btn-success"
          @click="add"
          name="add">
          {{$t('Add Observation Log')}}
        </button>
      </farm-card>
      <farm-card v-if="current">
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

        <div
          v-for="(image, i) in images"
          :key="`preview-${i}`"
          class="form-item form-item-name form-group">
          <!-- NOTE: Display is set to 'none' if the img fails to load. -->
          <img
            :src="image.url"
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
          <button
            type="button"
            class="btn btn-success"
            @click="cancel"
            name="cancel">
            {{$t('Cancel')}}
          </button>
        </div>
      </farm-card>
      <farm-tiles
        v-if="!current"
        :columns="[1, 2, 3]"
        :space="['none', 's']"
        dividers>
        <farm-card v-for="(log, i) in logs" :key="`observation-${i}`">
          <farm-text @click="view(log.id)">{{ log.name }}</farm-text>
        </farm-card>
      </farm-tiles>
    </farm-stack>
  </farm-main>
</template>

<script>
const { daysAway, useEntities } = window.lib;
const {
  computed, inject, ref,
} = window.Vue;

export default {
  name: 'ObservationsContainer',
  setup() {
    const {
      append, attachFile, checkout, commit, restoreFiles,
    } = useEntities();

    const profile = inject('profile');
    const logFilter = {
      type: 'log--observation',
      'owner.id': profile.user.id,
      timestamp: { $gt: daysAway(Date.now(), -30) },
    };
    const logs = checkout('log', logFilter);

    const currentID = ref(logs[0]?.id);
    const current = computed(() => logs.find(l => l.id === currentID.value));
    const view = (id) => {
      currentID.value = id;
    };
    function add() {
      const { id } = append(logs, 'log--observation', { status: 'done' });
      currentID.value = id;
    }

    function loadPhoto(filelist) {
      attachFile(current, 'image', filelist);
    }

    const images = computed(() => {
      if (!current.value) return [];
      return restoreFiles(current.value, 'image');
    });
    const save = () => commit(current.value);
    const cancel = () => { currentID.value = undefined; };

    return {
      add,
      cancel,
      current,
      currentID,
      images,
      loadPhoto,
      logs,
      save,
      view,
    };
  },
};
</script>

<style>
</style>
