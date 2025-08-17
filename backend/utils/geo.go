package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// simple in-memory cache for IP -> location label
var (
	geoCache   = map[string]string{}
	geoCacheMu sync.RWMutex
)

type ipApiResponse struct {
	Status  string `json:"status"`
	Country string `json:"country"`
	Region  string `json:"regionName"`
	City    string `json:"city"`
}

// GetGeoLabel returns a short human-readable location for an IP using ip-api.com
// Example output: "City, Region, Country". Falls back to "Unknown location".
func GetGeoLabel(ip string) string {
	if ip == "" {
		return "Unknown location"
	}

	geoCacheMu.RLock()
	cached, ok := geoCache[ip]
	geoCacheMu.RUnlock()
	if ok {
		return cached
	}

	client := &http.Client{Timeout: 2 * time.Second}
	req, _ := http.NewRequest("GET", fmt.Sprintf("http://ip-api.com/json/%s", ip), nil)
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		return "Unknown location"
	}
	defer resp.Body.Close()

	var data ipApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil || data.Status != "success" {
		return "Unknown location"
	}

	parts := ""
	if data.City != "" {
		parts = data.City
	}
	if data.Region != "" {
		if parts != "" {
			parts += ", "
		}
		parts += data.Region
	}
	if data.Country != "" {
		if parts != "" {
			parts += ", "
		}
		parts += data.Country
	}
	if parts == "" {
		parts = "Unknown location"
	}

	geoCacheMu.Lock()
	geoCache[ip] = parts
	geoCacheMu.Unlock()
	return parts
}
