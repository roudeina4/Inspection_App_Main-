declare namespace google.maps.places {
  class Autocomplete {
    constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
    addListener(event: string, handler: () => void): void;
    getPlace(): PlaceResult;
  }
  class AutocompleteService {
    getPlacePredictions(
      request: AutocompletionRequest,
      callback: (results: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void
    ): void;
  }
  interface AutocompletionRequest {
    input: string;
    types?: string[];
    componentRestrictions?: { country: string | string[] };
  }
  interface AutocompletePrediction {
    description: string;
    place_id: string;
  }
  interface AutocompleteOptions {
    types?: string[];
    componentRestrictions?: { country: string | string[] };
  }
  interface PlaceResult {
    formatted_address?: string;
    geometry?: {
      location: { lat(): number; lng(): number };
    };
  }
  enum PlacesServiceStatus {
    OK = "OK",
    ZERO_RESULTS = "ZERO_RESULTS",
    ERROR = "ERROR",
  }
}

interface Window {
  google?: typeof google;
}
