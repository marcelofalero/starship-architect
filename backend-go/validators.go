package main

import (
	"errors"
	"fmt"
)

// validateResourceData checks if the provided data map conforms to the schema for the given resource type.
func validateResourceData(resourceType string, data map[string]interface{}) error {
	if data == nil {
		return errors.New("data payload cannot be empty")
	}

	switch resourceType {
	case "ship":
		// A ship must have a configuration (object) and a manifest (array)
		if _, ok := data["configuration"].(map[string]interface{}); !ok {
			return errors.New("ship resource requires a 'configuration' object")
		}
		if _, ok := data["manifest"].([]interface{}); !ok {
			return errors.New("ship resource requires a 'manifest' array")
		}

	case "library":
		// A library should have components (array) or ships (array) if present
		if val, ok := data["components"]; ok {
			if _, isArray := val.([]interface{}); !isArray {
				return errors.New("library 'components' must be an array")
			}
		}
		if val, ok := data["ships"]; ok {
			if _, isArray := val.([]interface{}); !isArray {
				return errors.New("library 'ships' must be an array")
			}
		}

	case "hangar":
		// A hangar resource contains a list of ships in a 'ships' key
		if val, ok := data["ships"]; ok {
			if _, isArray := val.([]interface{}); !isArray {
				return errors.New("hangar 'ships' must be an array")
			}
		} else {
			return errors.New("hangar resource requires a 'ships' array")
		}

	case "config":
		// Configuration is flexible, no strict validation for now.
		// Just ensure it's a valid JSON object (which map[string]interface{} implies).

	default:
		return fmt.Errorf("unknown resource type: %s", resourceType)
	}

	return nil
}
