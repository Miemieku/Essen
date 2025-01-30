const API_BASE_URL = "https://datenplattform-essen.netlify.app/.netlify/functions";

// 1️⃣ 获取污染物索引
function fetchComponentIndex() {
    return fetch(`${API_BASE_URL}/ubaProxy`)
        .then(response => response.json())
        .catch(error => console.error("❌ Fehler beim Laden der Komponenten:", error));
}

// 2️⃣ 获取实时空气质量数据
function fetchAirQualityData(stationId) {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const hour = now.getHours();

    return fetch(`${API_BASE_URL}/airQualityProxy?date_from=${date}&date_to=${date}&time_from=${hour}&time_to=${hour}&station=${stationId}`)
        .then(response => response.json())
        .catch(error => console.error(`❌ Fehler beim Laden der Luftqualität für ${stationId}:`, error));
}
