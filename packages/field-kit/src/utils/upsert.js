// A function for mutating an array of objects IN PLACE. It takes the array to
// be mutated, an identifier (eg, 'localID') and the new or updated element.
const upsert = (arr, identifier, el) => {
  const i = arr.findIndex(_el => el[identifier] === _el[identifier]);
  const isNew = i < 0;
  if (isNew) arr.push(el);
  else arr.splice(i, 1, el);
};

export default upsert;
