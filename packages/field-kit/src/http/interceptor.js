import {
  clone, curryN, evolve, partition, reduce,
} from 'ramda';
import { getHost } from '../farm/remote';
import { asArray } from '../utils/asArray';
import Warning from '../warnings/Warning';

function evaluateResponse(response = {}, errorMsg) {
  const { status, data = {} } = response;
  const defaultValues = {
    loginRequired: false,
    repeatable: false,
    notFound: false,
    message: '',
  };
  if (status === 400 && data.error === 'invalid_grant') {
    return {
      ...defaultValues,
      loginRequired: true,
      repeatable: true,
      message: `${status} error: ${data.error_description || data.error}`,
    };
  }
  if (status === 400 && data.error === 'invalid_client') {
    const oauthConfigUrl = `https://${getHost()}/admin/config/farm/oauth`;
    return {
      ...defaultValues,
      loginRequired: true,
      repeatable: true,
      message: 'The OAuth client for farmOS Field Kit is not enabled on your farmOS server. '
        + `If you are an administrator, you can enable it <a href=${oauthConfigUrl}>here</a>.`,
    };
  }
  if (status === 401) {
    const resetUrl = `https://${getHost()}/user/password`;
    return {
      ...defaultValues,
      loginRequired: true,
      repeatable: true,
      message: 'The username or password you entered was incorrect. '
        + `Please try again, or <a href="${resetUrl}">reset your password</a>.`,
    };
  }
  if (status === 403) {
    return {
      ...defaultValues,
      loginRequired: true,
      message: `${status} error: ${data.error_description}`,
    };
  }
  if (status === 404) {
    return {
      ...defaultValues,
      notFound: true,
    };
  }
  const description = data.error_description
    || data.error
    || errorMsg
    || response.statusText
    || '';
  const infix = description ? ': ' : '';
  const message = `${status} error${infix}${description}.`;
  if (status >= 500) {
    return {
      ...defaultValues,
      repeatable: true,
      message,
    };
  }
  // Any other 4xx status codes or other unexpected errors.
  return {
    ...defaultValues,
    message,
  };
}

function evaluate(error) {
  let loginRequired = false;
  let requested = false;
  let responded = false;
  let repeatable = null;
  let notFound = null;
  let message = '';

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const result = evaluateResponse(error.response, error.message);
    loginRequired = loginRequired || result.loginRequired;
    requested = true;
    responded = true;
    repeatable = result.repeatable ? error : repeatable;
    notFound = result.notFound ? error : notFound;
    message = result.message;
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    requested = true;
    repeatable = error;
  } else {
    // Something happened in setting up the request that triggered an Error
    message = error.message || '';
  }
  return {
    loginRequired,
    requested,
    responded,
    repeatable,
    notFound,
    warning: [message, error],
  };
}

// Warnings are evaluated as tuples, then concatenated as a map, keyed by their
// message string in order to eliminate duplicates. Empty messages are omitted.
function addErrorToWarnings([message, error], warnings) {
  if (message !== '') {
    warnings.set(message, error);
  }
  return warnings;
}

// Reducer function for aggregating the evaluations from all sync results.
function concatenate(accumulator, error) {
  // Skip it and return the accumulator if it's not a valid instance of Error.
  if (!(error instanceof Error)) return accumulator;
  const evaluation = evaluate(error);
  const additiveTransforms = evolve({
    loginRequired: bool1 => bool2 => bool1 || bool2,
    requested: bool => num => bool + num,
    responded: bool => num => bool + num,
    repeatable: obj => arr => [...arr, ...asArray(obj)],
    notFound: obj => arr => [...arr, ...asArray(obj)],
    warning: tuple => map => addErrorToWarnings(tuple, map),
  }, evaluation);
  return evolve(additiveTransforms, accumulator);
}

function interceptor(handler, syncResults, overrides = {}) {
  const { data, fulfilled, rejected } = clone(syncResults);
  if (rejected.length < 1) {
    // Early return if no errors were encountered, but make sure to run the
    // handler still, with default values that indicate all successful requests.
    handler({
      loginRequired: false,
      repeatable: [],
      connectivity: 1,
      notFound: [],
      warnings: [],
      data,
      fulfilled,
      rejected,
    });
    return syncResults;
  }
  const [interceptErrors, overrideErrors] = partition(
    error => typeof overrides[error?.response?.status] !== 'function',
    rejected,
  );
  overrideErrors.forEach((error) => {
    const override = overrides[error.response.status];
    override(error);
  });
  const initEvaluation = {
    loginRequired: false,
    requested: 0,
    responded: 0,
    repeatable: [],
    notFound: [],
    warning: new Map(),
  };
  const {
    requested, responded, warning, ...rest
  } = reduce(concatenate, initEvaluation, interceptErrors);
  // As long as the number of request attempts is non-zero, a quotient can be
  // calculated by division; otherwise, no requests were made, so the network
  // status is unknown, as denoted by -1, which will be ignored by updateStatus.
  const connectivity = requested > 0 ? responded / requested : -1;
  const warnings = Array.from(warning)
    .map(([message, error]) => new Warning(message, error));
  const evaluation = {
    ...rest, connectivity, warnings, data, fulfilled, rejected,
  };
  handler(evaluation);
  return syncResults;
}

export default curryN(2, interceptor);
