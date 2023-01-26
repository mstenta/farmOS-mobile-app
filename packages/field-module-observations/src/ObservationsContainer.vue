<template>
  <app-bar-options :title="$t('Observations')" nav="back"/>

  <farm-main>
    <farm-stack :space="['none', 'none', 's']" :dividers="true">
      <farm-card>
        <h3>{{ $t('Images')}}</h3>

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
            v-for="(url, i) in imageUrls"
            :src="url"
            :key="`preview-${i}`"
            onerror="this.style.display='none'"
            class="preview"/>
        </div>
      </farm-card>
    </farm-stack>
  </farm-main>
</template>

<script>
const { useEntities } = window.lib;
const { computed, inject, ref } = window.Vue;

function readFileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default {
  name: 'ObservationsContainer',
  setup() {
    const { checkout, revise } = useEntities();

    const profile = inject('profile');
    const logFilter = {
      'owner.id': profile.user.id,
      type: 'log--observation',
    };
    const logs = checkout('log', logFilter);
    const current = ref(logs[0]);

    const imageUrls = computed(() => current.image.filter(img => typeof img === 'string'));

    function loadPhoto(files) {
      files.forEach((file) => {
        readFileData(file).then((data) => {
          const props = {
            image: current.image.concat(data),
          };
          revise(current, props);
        });
      });
    }

    return {
      current,
      imageUrls,
      loadPhoto,
      logs,
    };
  },
};
</script>

<style>
  .preview {
    width: 100%;
    height: 100%;
  }
</style>
