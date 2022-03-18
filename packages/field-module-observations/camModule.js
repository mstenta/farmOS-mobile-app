// A Vuex module & utlities for accessing the camera via Cordova
export default {
  actions: {
    /*
    called when the get photo button is tapped
    */
    getPhotoFromCamera({ commit }, log) {
      function handleResponse(photoLoc) {
        const dataURL = `data:image/jpeg;base64,${photoLoc}`;
        const props = {
          images: log.images.concat(dataURL),
          localID: log.localID,
        };
        commit('updateLog', props);
      }
      function handleError(error) { // eslint-disable-line no-unused-vars
      }
      getPhotoFromCamera() // eslint-disable-line no-use-before-define
        .then(handleResponse, handleError);
    },
    loadPhotoBlob({ commit }, { file, log }) {
      readFileData(file).then((data) => { // eslint-disable-line no-use-before-define
        const props = {
          images: log.images.concat(data),
          localID: log.localID,
        };
        commit('updateLog', props);
      });
    },
  },
};

/*
Utilizes the Cordova camera plugin to obtain an image URI
*/
function getPhotoFromCamera() {
  return new Promise((resolve, reject) => {
    function onSuccess(imageURI) {
      resolve(imageURI);
    }
    function onFail(message) {
      reject(message);
    }

    const options = {
      quality: 50,
      destinationType: Camera.DestinationType.DATA_URL, // eslint-disable-line no-undef
    };
    navigator.camera.getPicture(onSuccess, onFail, options);
  });
}

function readFileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
