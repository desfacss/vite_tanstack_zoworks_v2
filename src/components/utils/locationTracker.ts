import { supabase } from "@/lib/supabase";

// Constant for the local storage key prefix
const LAST_RECORD_TIME_KEY_PREFIX = "lastLocationTime_";
// Constant for the rate limit in milliseconds (2 minutes)
const RATE_LIMIT_MS = 2 * 60 * 1000; 

/**
 * Determines the current application environment.
 * @returns {string} The detected environment.
 */
function getAppEnvironment() {
  const userAgent = navigator.userAgent;
  if (window.matchMedia('(display-mode: standalone)').matches || (navigator.standalone === true)) {
    return "PWA_Standalone";
  }
  if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
    return "Mobile_Browser";
  }
  return "Desktop_Browser";
}

/**
 * Gets the user's current location and saves it to the 'loc_agent_locations' table in Supabase,
 * but only if the last recorded location for this user_id was more than 2 minutes ago (checked via localStorage).
 *
 * @param {string} eventSource - The name of the event or button that triggered the call.
 * @param {string} userId - The unique user ID (REQUIRED).
 * @returns {Promise<boolean>} A promise that resolves to 'true' if location was saved or skipped due to rate limit, 'false' otherwise (on error).
 */
export async function trackAndSaveLocation(eventSource, userId) {
    console.log(`Attempting to track location for user: ${userId} (Event: ${eventSource})`);

    // --- 1. Initial Checks ---
    if (!userId) {
        console.error("User ID is required for rate limiting.");
        return false;
    }
    if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser.");
        return false;
    }
    
    const localStorageKey = `${LAST_RECORD_TIME_KEY_PREFIX}${userId}`;
    const currentTime = new Date().getTime();
    
    // --- 2. Rate Limit Check (Local Storage) ---
    const lastRecordTimeStr = localStorage.getItem(localStorageKey);

    if (lastRecordTimeStr) {
        const lastRecordTime = parseInt(lastRecordTimeStr, 10);
        const timeElapsed = currentTime - lastRecordTime;
        
        if (timeElapsed < RATE_LIMIT_MS) {
            const timeRemaining = (RATE_LIMIT_MS - timeElapsed) / 1000;
            console.log(`Rate limit enforced: Skipping location update. Wait ${timeRemaining.toFixed(0)} seconds.`);
            // Return true to indicate successful execution (but action was skipped)
            return true; 
        }
        console.log("Rate limit passed. Proceeding with new location.");
    } else {
        console.log("No previous local record found. Proceeding.");
    }

    // --- 3. Get New Location and Save ---
    const appEnvironment = getAppEnvironment();

    try {
        // Get the current position (FIRST NETWORK CALL/SLOW OPERATION)
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            });
        });

        const { latitude: lat, longitude: lng } = position.coords;

        // Prepare the data payload
        const locationData = {
            user_id: userId,
            lat: lat,
            lng: lng,
            event_source: eventSource,
            app_environment: appEnvironment,
        };

        // Save the location to Supabase (SECOND NETWORK CALL)
        const { error: insertError } = await supabase
            .from("loc_agent_locations")
            .insert([locationData]);

        if (insertError) {
            console.error("Supabase insertion error:", insertError);
            alert("Location tracking failed: Could not save to database.");
            return false;
        }

        // --- 4. Update Local Storage on SUCCESS ---
        // Only update the timestamp if the database write was successful
        localStorage.setItem(localStorageKey, currentTime.toString());
        console.log("Location successfully saved to Supabase and local cache updated.");
        return true;

    } catch (error) {
        let errorMessage = "An unknown location error occurred.";
        // ... (Error handling remains the same)
        if (error.code === 1) {
            errorMessage = "Permission denied to access location.";
        } else if (error.code === 2) {
            errorMessage = "Position unavailable (e.g., service off).";
        } else if (error.code === 3) {
            errorMessage = "Location request timed out.";
        } else if (error.message) {
            errorMessage = error.message;
        }

        console.error("Location tracking error:", errorMessage, error);
        alert(`Location tracking failed: ${errorMessage}`);
        return false;
    }
}