// Re-export desde la única fuente de verdad: src/front/api/backend.js
// (antes este archivo era un duplicado idéntico y podía divergir).
export {
  getBackendURL,
  API_BASE,
  authHeaders,
  jsonAuthHeaders,
  authFetch,
} from "../api/backend";

import { API_BASE } from "../api/backend";
export default API_BASE;
